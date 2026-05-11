"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ServerGlyph } from "@/components/servers/ServerGlyph";
import { FileExplorer, type DirEntry } from "@/components/ssh/FileExplorer";
import { FileEditor } from "@/components/ssh/FileEditor";
import { QuickCommands } from "@/components/ssh/QuickCommands";
import { TerminalPane } from "@/components/ssh/TerminalPane";
import { InputModal } from "@/components/ui/InputModal";
import { useSshConnections, useSshSessionSlice } from "@/context/ssh-connections-context";
import { joinRemote } from "@/lib/paths";
import type { ClientMessage, ConnectPayload, ServerMessage } from "@/types/ws-messages";

type Props = {
  serverId: string;
  serverMeta: { name: string; iconId: string };
  hostLine: string;
  connectPayload: ConnectPayload;
};

function shSingleQuoted(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function quickCommandLine(command: string, browseCwd: string): string {
  const cwd = browseCwd.trim();
  if (cwd) return `cd -- ${shSingleQuoted(cwd)} && ${command}`;
  return command;
}

function normalizeShellCwd(p: string): string {
  const line = p.split("\n")[0]?.trim() ?? "";
  if (!line.startsWith("/")) return "/";
  return line.replace(/\/{2,}/g, "/") || "/";
}

export function SshWorkspace({ serverId, serverMeta, hostLine, connectPayload }: Props) {
  const [browsePath, setBrowsePath] = useState("/");
  const browsePathRef = useRef(browsePath);
  useEffect(() => {
    browsePathRef.current = browsePath;
  }, [browsePath]);

  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [editorPath, setEditorPath] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [baselineContent, setBaselineContent] = useState("");
  const [sftpBusy, setSftpBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [nameDialog, setNameDialog] = useState<null | "mkdir" | "newFile">(null);

  const dirty = editorPath !== null && editorContent !== baselineContent;

  const sendRef = useRef<(msg: ClientMessage) => void>(() => {});
  const requestListRef = useRef<(path: string) => void>(() => {});

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "sftp-list":
        setEntries(msg.entries);
        setSftpBusy(false);
        break;
      case "file-content":
        setEditorPath(msg.path);
        setEditorContent(msg.content);
        setBaselineContent(msg.content);
        setSftpBusy(false);
        break;
      case "shell-cwd": {
        const next = normalizeShellCwd(msg.path);
        if (next === browsePathRef.current) break;
        requestListRef.current(next);
        break;
      }
      case "info":
        setToast(msg.message);
        window.setTimeout(() => setToast(null), 2500);
        setSftpBusy(false);
        sendRef.current({ type: "sftp-list", path: browsePathRef.current });
        break;
      case "error":
        setSftpBusy(false);
        break;
      default:
        break;
    }
  }, []);

  const onSocketClosed = useCallback(() => {
    setEntries([]);
    setEditorPath(null);
    setEditorContent("");
    setBaselineContent("");
    browsePathRef.current = "/";
    setBrowsePath("/");
  }, []);

  const {
    connect: connectSession,
    disconnect: disconnectSession,
    send: sendToServer,
    clearSessionError,
    registerMessageHandler,
    registerConnectionLostHandler,
  } = useSshConnections();
  const { connected, connecting, lastError, termChunks } = useSshSessionSlice(serverId);

  const send = useCallback(
    (msg: ClientMessage) => {
      sendToServer(serverId, msg);
    },
    [sendToServer, serverId],
  );

  sendRef.current = send;

  useEffect(() => {
    return registerMessageHandler(serverId, handleServerMessage);
  }, [serverId, handleServerMessage, registerMessageHandler]);

  useEffect(() => {
    return registerConnectionLostHandler(serverId, onSocketClosed);
  }, [serverId, onSocketClosed, registerConnectionLostHandler]);

  useEffect(() => {
    if (!lastError || !connected) return;
    setErrorToast(lastError);
    const t = window.setTimeout(() => setErrorToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [lastError, connected]);

  useEffect(() => {
    if (!connected) return;
    setSftpBusy(true);
    send({ type: "sftp-list", path: browsePathRef.current });
  }, [connected, send]);

  const requestList = useCallback(
    (path: string) => {
      browsePathRef.current = path;
      setBrowsePath(path);
      setSftpBusy(true);
      send({ type: "sftp-list", path });
    },
    [send],
  );

  requestListRef.current = requestList;

  const onDisconnect = useCallback(() => {
    disconnectSession(serverId);
    onSocketClosed();
  }, [disconnectSession, serverId, onSocketClosed]);

  const sendTerminalResize = useCallback(
    (cols: number, rows: number) => {
      if (connected) send({ type: "terminal-resize", cols, rows });
    },
    [connected, send],
  );

  const sendTerminalData = useCallback(
    (data: string) => {
      if (connected) send({ type: "terminal-input", data });
    },
    [connected, send],
  );

  const runQuick = useCallback(
    (command: string) => {
      if (!connected) return;
      const line = `${quickCommandLine(command, browsePath)}\r`;
      send({ type: "terminal-input", data: line });
    },
    [browsePath, connected, send],
  );

  const showConnectError = Boolean(!connected && lastError && !connecting);
  const showLoadingGate = Boolean(connecting && !connected);
  const showDisconnectedIdle = Boolean(!connected && !connecting && !lastError);

  return (
    <main className='flex h-screen min-h-0 flex-col'>
      <div className='flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--panel)]/90 px-4 py-3 backdrop-blur-md'>
        <Link
          href='/'
          className='rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:border-[var(--border-hover)]'
        >
          ← Servers
        </Link>
        <div className='flex items-center gap-2 text-[var(--foreground)]'>
          <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--background)] text-[var(--accent)]'>
            <ServerGlyph iconId={serverMeta.iconId} size={20} />
          </div>
          <div className='min-w-0'>
            <div className='truncate text-sm font-medium'>{serverMeta.name}</div>
            <div className='truncate text-xs text-[var(--muted)]'>{hostLine}</div>
          </div>
        </div>
        <div className='ml-auto flex flex-wrap items-center gap-2'>
          {connected ? (
            <button
              type='button'
              onClick={onDisconnect}
              className='rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500'
            >
              Disconnect
            </button>
          ) : (
            <button
              type='button'
              disabled={connecting}
              onClick={() => {
                clearSessionError(serverId);
                connectSession(serverId, connectPayload);
              }}
              className='rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-[0_0_24px_-6px_rgba(226,102,245,0.5)] hover:opacity-90 disabled:opacity-50'
            >
              {connecting ? "Connecting…" : "Connect"}
            </button>
          )}
        </div>
      </div>

      {showLoadingGate ? (
        <div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4'>
          <div
            className='h-9 w-9 animate-spin rounded-full border-2 border-[var(--border-hover)] border-t-[var(--accent)]'
            aria-hidden
          />
          <p className='text-sm text-[var(--muted)]'>Connecting to the server…</p>
        </div>
      ) : null}

      {showConnectError ? (
        <div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4'>
          <p className='max-w-md text-center text-sm text-red-400' role='alert'>
            {lastError}
          </p>
          <div className='flex flex-wrap items-center justify-center gap-3'>
            <button
              type='button'
              onClick={() => {
                clearSessionError(serverId);
                connectSession(serverId, connectPayload);
              }}
              className='rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-[0_0_24px_-6px_rgba(226,102,245,0.5)] hover:opacity-90'
            >
              Retry
            </button>
            <Link href='/' className='text-sm text-[var(--accent)] hover:underline'>
              Back to servers
            </Link>
          </div>
        </div>
      ) : null}

      {showDisconnectedIdle ? (
        <div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4'>
          <p className='text-sm text-[var(--muted)]'>No active connection</p>
          <p className='text-center text-xs text-[var(--muted)]'>Click «Connect» in the header</p>
        </div>
      ) : null}

      {connected ? (
        <>
          <QuickCommands disabled={!connected} onRun={runQuick} />

          {toast ? (
            <div className='border-b border-emerald-800 bg-emerald-950/80 px-4 py-1 text-center text-xs text-emerald-200'>
              {toast}
            </div>
          ) : null}

          {errorToast ? (
            <div
              role='alert'
              className='fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-red-800/80 bg-red-950/95 px-4 py-3 text-sm text-red-100 shadow-lg'
            >
              {errorToast}
            </div>
          ) : null}

          <div className='grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] md:grid-cols-[260px_1fr] md:grid-rows-[minmax(0,1fr)_auto]'>
            <div className='h-full min-h-[180px] md:min-h-0'>
              <FileExplorer
                path={browsePath}
                entries={entries}
                busy={sftpBusy}
                onNavigate={requestList}
                onOpenFile={(path) => {
                  setSftpBusy(true);
                  send({ type: "sftp-read-file", path });
                }}
                onDelete={(path, isDir) => {
                  setSftpBusy(true);
                  send({ type: "sftp-delete", path, isDirectory: isDir });
                  if (editorPath === path) {
                    setEditorPath(null);
                    setEditorContent("");
                    setBaselineContent("");
                  }
                }}
                onMkdir={() => setNameDialog("mkdir")}
                onNewFile={() => setNameDialog("newFile")}
              />
            </div>

            <div className='flex h-full min-h-[240px] flex-col border-t border-[var(--border)] md:min-h-0 md:border-l md:border-t-0'>
              <FileEditor
                path={editorPath}
                content={editorContent}
                dirty={dirty}
                disabled={!connected || sftpBusy}
                onChange={(v) => {
                  setEditorContent(v);
                  clearSessionError(serverId);
                }}
                onSave={() => {
                  if (!editorPath) return;
                  setSftpBusy(true);
                  send({ type: "sftp-write-file", path: editorPath, content: editorContent });
                  setBaselineContent(editorContent);
                }}
              />
            </div>

            <div className='col-span-1 min-h-0 md:col-span-2'>
              <TerminalPane
                active={connected}
                onData={sendTerminalData}
                onResize={sendTerminalResize}
                serverChunks={termChunks}
              />
            </div>
          </div>

          <InputModal
            open={nameDialog !== null}
            onClose={() => setNameDialog(null)}
            title={nameDialog === "mkdir" ? "Folder name" : "File name"}
            placeholder={nameDialog === "mkdir" ? "new-folder" : "file.txt"}
            onSave={(name) => {
              setSftpBusy(true);
              const full = joinRemote(browsePath, name);
              if (nameDialog === "mkdir") {
                send({ type: "sftp-mkdir", path: full });
              } else if (nameDialog === "newFile") {
                send({ type: "sftp-write-file", path: full, content: "" });
                setEditorPath(full);
                setEditorContent("");
                setBaselineContent("");
              }
            }}
          />
        </>
      ) : null}
    </main>
  );
}
