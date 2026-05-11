"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { ClientMessage, ConnectPayload, ServerMessage } from "@/types/ws-messages";

const WS_PATH = "/api/ws";

function wsUrl(): string {
  const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = typeof window !== "undefined" ? window.location.host : "localhost:3000";
  return `${proto}//${host}${WS_PATH}`;
}

function termNewlines(s: string): string {
  return s.replace(/\r?\n/g, "\r\n");
}

function emptySession(): SessionSlice {
  return {
    connected: false,
    connecting: false,
    lastError: null,
    termChunks: [],
  };
}

export type SessionSlice = {
  connected: boolean;
  connecting: boolean;
  lastError: string | null;
  termChunks: string[];
};

type Ctx = {
  sessions: Record<string, SessionSlice>;
  activeConnectedCount: number;
  connect: (serverId: string, payload: ConnectPayload) => void;
  disconnect: (serverId: string) => void;
  send: (serverId: string, msg: ClientMessage) => void;
  clearSessionError: (serverId: string) => void;
  registerMessageHandler: (serverId: string, handler: (msg: ServerMessage) => void) => () => void;
  registerConnectionLostHandler: (serverId: string, handler: () => void) => () => void;
};

const SshConnectionsContext = createContext<Ctx | null>(null);

export function SshConnectionsProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Record<string, SessionSlice>>({});
  const wsByServerRef = useRef(new Map<string, WebSocket>());
  const handlersRef = useRef(new Map<string, (msg: ServerMessage) => void>());
  const connectionLostRef = useRef(new Map<string, () => void>());
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const appendTermChunk = useCallback((serverId: string, chunk: string) => {
    if (!chunk) return;
    setSessions((prev) => {
      const cur = prev[serverId] ?? emptySession();
      return {
        ...prev,
        [serverId]: { ...cur, termChunks: [...cur.termChunks, chunk] },
      };
    });
  }, []);

  const registerMessageHandler = useCallback((serverId: string, handler: (msg: ServerMessage) => void) => {
    handlersRef.current.set(serverId, handler);
    return () => {
      handlersRef.current.delete(serverId);
    };
  }, []);

  const registerConnectionLostHandler = useCallback((serverId: string, handler: () => void) => {
    connectionLostRef.current.set(serverId, handler);
    return () => {
      connectionLostRef.current.delete(serverId);
    };
  }, []);

  const clearSessionError = useCallback((serverId: string) => {
    setSessions((prev) => {
      const cur = prev[serverId];
      if (!cur) return prev;
      return { ...prev, [serverId]: { ...cur, lastError: null } };
    });
  }, []);

  const send = useCallback((serverId: string, msg: ClientMessage) => {
    const ws = wsByServerRef.current.get(serverId);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const disconnect = useCallback((serverId: string) => {
    const ws = wsByServerRef.current.get(serverId);
    if (ws) {
      ws.close();
      wsByServerRef.current.delete(serverId);
    }
    setSessions((prev) => {
      if (!(serverId in prev)) return prev;
      const next = { ...prev };
      delete next[serverId];
      return next;
    });
  }, []);

  const connect = useCallback(
    (serverId: string, payload: ConnectPayload) => {
      const snap = sessionsRef.current[serverId];
      const existingWs = wsByServerRef.current.get(serverId);
      if (snap?.connected && existingWs?.readyState === WebSocket.OPEN) {
        return;
      }

      if (existingWs) {
        existingWs.close();
        wsByServerRef.current.delete(serverId);
      }

      setSessions((prev) => ({
        ...prev,
        [serverId]: {
          ...(prev[serverId] ?? emptySession()),
          connecting: true,
          lastError: null,
        },
      }));

      const ws = new WebSocket(wsUrl());
      wsByServerRef.current.set(serverId, ws);

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "connect", payload } satisfies ClientMessage));
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as ServerMessage;

          if (msg.type === "connected") {
            setSessions((prev) => {
              const cur = prev[serverId] ?? emptySession();
              return {
                ...prev,
                [serverId]: { ...cur, connected: true, connecting: false, lastError: null },
              };
            });
          }

          if (msg.type === "error") {
            setSessions((prev) => {
              const cur = prev[serverId] ?? emptySession();
              return {
                ...prev,
                [serverId]: { ...cur, connecting: false, lastError: msg.message },
              };
            });
          }

          if (msg.type === "terminal") {
            appendTermChunk(serverId, msg.data);
          } else if (msg.type === "terminal-closed") {
            appendTermChunk(
              serverId,
              `\r\n\x1b[31m[shell session closed]\x1b[0m\r\n`,
            );
          } else if (msg.type === "exec-result") {
            const raw = [msg.stdout, msg.stderr].filter(Boolean).join("");
            const out = raw ? termNewlines(raw) : "";
            const line = `\r\n\x1b[33m$ ${msg.command}\x1b[0m\r\n${out || "(no output)"}\r\n\x1b[90mcode: ${msg.code}\x1b[0m\r\n`;
            appendTermChunk(serverId, line);
          }

          handlersRef.current.get(serverId)?.(msg);
        } catch {
          setSessions((prev) => {
            const cur = prev[serverId] ?? emptySession();
            return {
              ...prev,
              [serverId]: { ...cur, connecting: false, lastError: "Invalid server response" },
            };
          });
        }
      };

      ws.onclose = () => {
        if (wsByServerRef.current.get(serverId) !== ws) return;
        wsByServerRef.current.delete(serverId);
        setSessions((prev) => {
          const cur = prev[serverId] ?? emptySession();
          return {
            ...prev,
            [serverId]: {
              ...cur,
              connected: false,
              connecting: false,
            },
          };
        });
        connectionLostRef.current.get(serverId)?.();
      };

      ws.onerror = () => {
        setSessions((prev) => {
          const cur = prev[serverId] ?? emptySession();
          return {
            ...prev,
            [serverId]: { ...cur, connecting: false, lastError: "WebSocket error" },
          };
        });
      };
    },
    [appendTermChunk],
  );

  const activeConnectedCount = useMemo(
    () => Object.values(sessions).filter((s) => s.connected).length,
    [sessions],
  );

  const value = useMemo(
    () => ({
      sessions,
      activeConnectedCount,
      connect,
      disconnect,
      send,
      clearSessionError,
      registerMessageHandler,
      registerConnectionLostHandler,
    }),
    [
      sessions,
      activeConnectedCount,
      connect,
      disconnect,
      send,
      clearSessionError,
      registerMessageHandler,
      registerConnectionLostHandler,
    ],
  );

  return <SshConnectionsContext.Provider value={value}>{children}</SshConnectionsContext.Provider>;
}

export function useSshConnections(): Ctx {
  const ctx = useContext(SshConnectionsContext);
  if (!ctx) {
    throw new Error("useSshConnections must be used within SshConnectionsProvider");
  }
  return ctx;
}

export function useSshSessionSlice(serverId: string): SessionSlice {
  const { sessions } = useSshConnections();
  return sessions[serverId] ?? emptySession();
}
