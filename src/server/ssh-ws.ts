import type { WebSocket } from "ws";
import { connectPayloadSchema, type ClientMessage, type ServerMessage } from "@/types/ws-messages";
import { SshSession } from "@/server/ssh-session";

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function handleSshSocket(ws: WebSocket) {
  let session: SshSession | null = null;
  let busy = false;

  const safeSendError = (message: string) => send(ws, { type: "error", message });

  ws.on("message", async (raw) => {
    let parsed: ClientMessage;
    try {
      parsed = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      safeSendError("Invalid message");
      return;
    }

    try {
      switch (parsed.type) {
        case "connect": {
          session?.dispose();
          session = null;
          const payload = connectPayloadSchema.parse(parsed.payload);
          const ssh = new SshSession(
            (data) => send(ws, { type: "terminal", data }),
            (code, signal) => send(ws, { type: "terminal-closed", code, signal }),
            (message) => safeSendError(message),
            (path) => send(ws, { type: "shell-cwd", path }),
          );
          await ssh.connect(payload);
          session = ssh;
          send(ws, { type: "connected" });
          break;
        }
        case "terminal-input": {
          if (!session) {
            safeSendError("First, connect");
            return;
          }
          session.writeTerminal(parsed.data);
          break;
        }
        case "terminal-resize": {
          session?.resizeTerminal(parsed.cols, parsed.rows);
          break;
        }
        case "sftp-list": {
          if (!session) {
            safeSendError("First, connect");
            return;
          }
          if (busy) return;
          busy = true;
          try {
            const entries = await session.listDir(parsed.path);
            send(ws, { type: "sftp-list", path: parsed.path, entries });
          } catch (e) {
            safeSendError(e instanceof Error ? e.message : "Error reading directory");
          } finally {
            busy = false;
          }
          break;
        }
        case "sftp-read-file": {
          if (!session) {
            safeSendError("First, connect");
            return;
          }
          if (busy) return;
          busy = true;
          try {
            const content = await session.readFile(parsed.path);
            send(ws, { type: "file-content", path: parsed.path, content });
          } catch (e) {
            safeSendError(e instanceof Error ? e.message : "Error reading file");
          } finally {
            busy = false;
          }
          break;
        }
        case "sftp-write-file": {
          if (!session) {
            safeSendError("First, connect");
            return;
          }
          if (busy) return;
          busy = true;
          try {
            await session.writeFile(parsed.path, parsed.content);
            send(ws, { type: "info", message: "File saved" });
          } catch (e) {
            safeSendError(e instanceof Error ? e.message : "Error writing file");
          } finally {
            busy = false;
          }
          break;
        }
        case "sftp-delete": {
          if (!session) {
            safeSendError("First, connect");
            return;
          }
          if (busy) return;
          busy = true;
          try {
            await session.deletePath(parsed.path, parsed.isDirectory);
            send(ws, { type: "info", message: "Deleted" });
          } catch (e) {
            safeSendError(e instanceof Error ? e.message : "Error deleting");
          } finally {
            busy = false;
          }
          break;
        }
        case "sftp-mkdir": {
          if (!session) {
            safeSendError("First, connect");
            return;
          }
          if (busy) return;
          busy = true;
          try {
            await session.mkdir(parsed.path);
            send(ws, { type: "info", message: "Directory created" });
          } catch (e) {
            safeSendError(e instanceof Error ? e.message : "Error creating directory");
          } finally {
            busy = false;
          }
          break;
        }
        case "exec": {
          if (!session) {
            safeSendError("First, connect");
            return;
          }
          if (busy) return;
          busy = true;
          try {
            const cwd = typeof parsed.cwd === "string" ? parsed.cwd : undefined;
            const { stdout, stderr, code } = await session.execOnce(parsed.command, cwd);
            send(ws, {
              type: "exec-result",
              command: parsed.command,
              stdout,
              stderr,
              code,
            });
          } catch (e) {
            safeSendError(e instanceof Error ? e.message : "Error executing command");
          } finally {
            busy = false;
          }
          break;
        }
        default:
          safeSendError("Unknown message type");
      }
    } catch (e) {
      safeSendError(e instanceof Error ? e.message : "Error");
    }
  });

  ws.on("close", () => {
    session?.dispose();
    session = null;
  });
}
