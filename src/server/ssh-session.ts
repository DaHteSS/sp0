import { Client, type ClientChannel, type SFTPWrapper, type ConnectConfig, type FileEntryWithStats } from "ssh2";
import type { ConnectPayload } from "@/types/ws-messages";

function buildConfig(payload: ConnectPayload): ConnectConfig {
  const config: ConnectConfig = {
    host: payload.host,
    port: payload.port,
    username: payload.username,
    readyTimeout: 20000,
  };

  if (payload.privateKey?.trim()) {
    config.privateKey = payload.privateKey;
    if (payload.passphrase) config.passphrase = payload.passphrase;
  } else if (payload.password) {
    config.password = payload.password;
  } else {
    throw new Error("Enter password or private key");
  }

  return config;
}

const CWD_OSC_PREFIX = "\x1b]7777;";

export class SshSession {
  private readonly client = new Client();
  private shell: ClientChannel | null = null;
  private sftp: SFTPWrapper | null = null;
  private cols = 80;
  private rows = 24;
  private termStripBuf = "";

  constructor(
    private readonly onTerminalData: (chunk: string) => void,
    private readonly onTerminalClose: (code?: number, signal?: string) => void,
    private readonly onError: (message: string) => void,
    private readonly onShellCwd?: (path: string) => void,
  ) {}

  connect(payload: ConnectPayload): Promise<void> {
    const config = buildConfig(payload);

    return new Promise((resolve, reject) => {
      this.client
        .on("ready", () => {
          this.client.shell(
            {
              term: "xterm-256color",
              cols: this.cols,
              rows: this.rows,
            },
            (shellErr, stream) => {
              if (shellErr || !stream) {
                reject(shellErr ?? new Error("Failed to open shell"));
                return;
              }
              this.shell = stream;
              stream.on("data", (buf: Buffer) => {
                const cleaned = this.stripCwdOscFromTerminal(buf.toString("utf8"));
                if (cleaned.length) this.onTerminalData(cleaned);
              });
              stream.on("close", (code: number, signal: string) => {
                this.onTerminalClose(code, signal);
              });
              stream.stderr?.on("data", (buf: Buffer) => {
                const cleaned = this.stripCwdOscFromTerminal(buf.toString("utf8"));
                if (cleaned.length) this.onTerminalData(cleaned);
              });

              this.scheduleShellCwdHookInstall();

              this.client.sftp((sftpErr, sftp) => {
                if (sftpErr || !sftp) {
                  reject(sftpErr ?? new Error("SFTP not available"));
                  return;
                }
                this.sftp = sftp;
                resolve();
              });
            },
          );
        })
        .on("error", (err: Error) => {
          this.onError(err.message);
          reject(err);
        })
        .connect(config);
    });
  }

  writeTerminal(data: string): void {
    if (!this.shell) return;
    this.shell.write(data);
  }

  resizeTerminal(cols: number, rows: number): void {
    this.cols = Math.max(20, Math.min(cols, 500));
    this.rows = Math.max(5, Math.min(rows, 500));
    if (this.shell && typeof this.shell.setWindow === "function") {
      this.shell.setWindow(this.rows, this.cols, 480, 640);
    }
  }

  async listDir(
    remotePath: string,
  ): Promise<{ name: string; longname: string; isDirectory: boolean; size: number; mtime?: number }[]> {
    const sftp = this.requireSftp();
    const entries = await new Promise<FileEntryWithStats[]>((res, rej) => {
      sftp.readdir(remotePath, (e, list) => (e ? rej(e) : res(list ?? [])));
    });
    return entries.map((e) => ({
      name: e.filename,
      longname: e.longname,
      isDirectory: (e.attrs.mode & 0o40000) === 0o40000,
      size: Number(e.attrs.size ?? 0),
      mtime: e.attrs.mtime ? Number(e.attrs.mtime) * 1000 : undefined,
    }));
  }

  async readFile(remotePath: string): Promise<string> {
    const sftp = this.requireSftp();
    const buf = await new Promise<Buffer>((res, rej) => {
      sftp.readFile(remotePath, (e, data) => (e ? rej(e) : res(data as Buffer)));
    });
    return buf.toString("utf8");
  }

  async writeFile(remotePath: string, content: string): Promise<void> {
    const sftp = this.requireSftp();
    await new Promise<void>((res, rej) => {
      sftp.writeFile(remotePath, Buffer.from(content, "utf8"), (e) => (e ? rej(e) : res()));
    });
  }

  async deletePath(remotePath: string, isDirectory: boolean): Promise<void> {
    const sftp = this.requireSftp();
    if (isDirectory) {
      await new Promise<void>((res, rej) => {
        sftp.rmdir(remotePath, (e) => (e ? rej(e) : res()));
      });
    } else {
      await new Promise<void>((res, rej) => {
        sftp.unlink(remotePath, (e) => (e ? rej(e) : res()));
      });
    }
  }

  async mkdir(remotePath: string): Promise<void> {
    const sftp = this.requireSftp();
    await new Promise<void>((res, rej) => {
      sftp.mkdir(remotePath, (e) => (e ? rej(e) : res()));
    });
  }

  private static shSingleQuoted(script: string): string {
    return `'${script.replace(/'/g, `'\\''`)}'`;
  }

  execOnce(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; code: number | null }> {
    const remote =
      typeof cwd === "string" && cwd.length > 0
        ? `sh -c ${SshSession.shSingleQuoted(`cd -- ${cwd} && ${command}`)}`
        : command;

    return new Promise((resolve, reject) => {
      this.client.exec(remote, (err, stream) => {
        if (err || !stream) {
          reject(err ?? new Error("exec failed"));
          return;
        }
        const chunksOut: Buffer[] = [];
        const chunksErr: Buffer[] = [];
        stream.on("data", (d: Buffer) => chunksOut.push(d));
        stream.stderr.on("data", (d: Buffer) => chunksErr.push(d));
        stream.on("close", (code: number) => {
          resolve({
            stdout: Buffer.concat(chunksOut).toString("utf8"),
            stderr: Buffer.concat(chunksErr).toString("utf8"),
            code: code ?? null,
          });
        });
      });
    });
  }

  dispose(): void {
    try {
      this.shell?.close();
    } catch {
      /* ignore */
    }
    this.shell = null;
    this.sftp = null;
    this.termStripBuf = "";
    this.client.end();
  }

  private splitIncompleteCwdOsc(buf: string): [string, string] {
    for (let i = buf.length - 1; i >= 0; i -= 1) {
      if (buf.charCodeAt(i) !== 0x1b) continue;
      const tail = buf.slice(i);
      if (CWD_OSC_PREFIX.startsWith(tail) && tail.length < CWD_OSC_PREFIX.length) {
        return [buf.slice(0, i), tail];
      }
      if (tail.startsWith(CWD_OSC_PREFIX)) {
        const after = tail.slice(CWD_OSC_PREFIX.length);
        if (!after.includes("\x07")) return [buf.slice(0, i), tail];
      }
    }
    return [buf, ""];
  }

  private stripCwdOscFromTerminal(chunk: string): string {
    if (!this.onShellCwd) {
      return chunk;
    }
    this.termStripBuf += chunk;
    let out = "";
    for (;;) {
      const idx = this.termStripBuf.indexOf(CWD_OSC_PREFIX);
      if (idx === -1) break;
      out += this.termStripBuf.slice(0, idx);
      this.termStripBuf = this.termStripBuf.slice(idx + CWD_OSC_PREFIX.length);
      const bel = this.termStripBuf.indexOf("\x07");
      if (bel === -1) {
        this.termStripBuf = CWD_OSC_PREFIX + this.termStripBuf;
        break;
      }
      const rawPath = this.termStripBuf.slice(0, bel).trim();
      this.termStripBuf = this.termStripBuf.slice(bel + 1);
      const line0 = rawPath.split("\n")[0]?.trim() ?? "";
      if (line0.startsWith("/")) {
        this.onShellCwd(line0);
      }
    }
    const [emit, keep] = this.splitIncompleteCwdOsc(this.termStripBuf);
    out += emit;
    this.termStripBuf = keep;
    return out;
  }

  private scheduleShellCwdHookInstall(): void {
    if (!this.onShellCwd) return;
    const t = setTimeout(() => {
      const ch = this.shell;
      if (!ch || typeof ch.write !== "function") return;
      const hook =
        "\n# sshTerminal: sync file tree with shell cwd\n" +
        `__st_rcwd(){ printf $'\\033]7777;%s\\007' "$PWD"; };` +
        '[ -n "$BASH_VERSION" ] && PROMPT_COMMAND="__st_rcwd${PROMPT_COMMAND:+;$PROMPT_COMMAND}";' +
        '[ -n "$ZSH_VERSION" ] && precmd_functions+=(__st_rcwd);' +
        "\n";
      ch.write(hook);
    }, 450);
    t.unref?.();
  }

  private requireSftp(): SFTPWrapper {
    if (!this.sftp) throw new Error("SFTP not ready");
    return this.sftp;
  }
}
