"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AddServerModal } from "@/components/servers/AddServerModal";
import { DeleteServerModal } from "@/components/servers/DeleteServerModal";
import { ServerGlyph } from "@/components/servers/ServerGlyph";
import { LineNotification } from "@/components/ui/LineNotification";
import { useSshConnections } from "@/context/ssh-connections-context";
import type { ServerListItem } from "@/types/stored-server";

export function ServerListScreen() {
  const { activeConnectedCount } = useSshConnections();
  const [servers, setServers] = useState<ServerListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editServerId, setEditServerId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServerListItem | null>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/servers");
      const data: unknown = await res.json();
      if (!res.ok) {
        setLoadError("Failed to load list");
        setServers([]);
        return;
      }
      const list =
        typeof data === "object" && data && "servers" in data && Array.isArray((data as { servers: unknown }).servers)
          ? (data as { servers: ServerListItem[] }).servers
          : [];
      setServers(list);
    } catch {
      setLoadError("Network unavailable");
      setServers([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const empty = servers !== null && servers.length === 0;

  return (
    <main className='flex min-h-screen flex-col'>
      {activeConnectedCount >= 2 ? (
        <LineNotification>
          You are connected to {activeConnectedCount} servers. This may affect performance. Disconnect from servers you
          are not using.
        </LineNotification>
      ) : null}
      <header className='border-b border-[var(--border)] bg-[var(--panel)]/90 px-6 py-4 backdrop-blur-md'>
        <p className='mt-1 text-sm text-[var(--muted)]'>Select a connection or add a new one</p>
      </header>

      <div className='flex flex-1 flex-col items-center px-4 py-10'>
        {servers === null ? (
          <p className='text-sm text-[var(--muted)]'>Loading…</p>
        ) : (
          <>
            {loadError ? <p className='mb-4 text-sm text-red-400'>{loadError}</p> : null}

            {empty ? (
              <button
                type='button'
                onClick={() => {
                  setEditServerId(null);
                  setAddModalOpen(true);
                }}
                className='rounded-2xl bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white shadow-[0_0_28px_-6px_rgba(226,102,245,0.55)] hover:opacity-90'
              >
                Add new connection
              </button>
            ) : (
              <div className='flex w-full max-w-2xl flex-col gap-4'>
                <div className='flex justify-end'>
                  <button
                    type='button'
                    onClick={() => {
                      setEditServerId(null);
                      setAddModalOpen(true);
                    }}
                    className='rounded-2xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-[0_0_24px_-6px_rgba(226,102,245,0.5)] hover:opacity-90'
                  >
                    Add new connection
                  </button>
                </div>
                <ul className='flex flex-col gap-2'>
                  {servers.map((s) => (
                    <li key={s.id}>
                      <div className='flex items-stretch gap-1 rounded-2xl border border-[var(--border)] bg-[var(--panel)]/90 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.45)] transition-colors hover:border-[var(--border-hover)]'>
                        <Link href={`/server/${s.id}`} className='flex min-w-0 flex-1 items-center gap-3 px-4 py-3'>
                          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--background)] text-[var(--accent)]'>
                            <ServerGlyph iconId={s.iconId} size={22} />
                          </div>
                          <div className='min-w-0 flex-1'>
                            <div className='truncate font-medium text-[var(--foreground)]'>{s.name}</div>
                            <div className='truncate text-xs text-[var(--muted)]'>
                              {s.username}@{s.host}:{s.port}
                              {s.useSshKey ? " · SSH key" : ""}
                            </div>
                          </div>
                        </Link>
                        <div className='flex shrink-0 items-center gap-0.5 pr-2'>
                          <button
                            type='button'
                            title='Edit'
                            onClick={() => {
                              setAddModalOpen(false);
                              setEditServerId(s.id);
                            }}
                            className='rounded-md p-2 text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-[var(--accent)]'
                          >
                            <Pencil className='h-4 w-4' aria-hidden />
                            <span className='sr-only'>Edit</span>
                          </button>
                          <button
                            type='button'
                            title='Delete'
                            onClick={() => setDeleteTarget(s)}
                            className='rounded-md p-2 text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-red-400'
                          >
                            <Trash2 className='h-4 w-4' aria-hidden />
                            <span className='sr-only'>Delete</span>
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <AddServerModal
        open={addModalOpen || editServerId !== null}
        editId={editServerId}
        onClose={() => {
          setAddModalOpen(false);
          setEditServerId(null);
        }}
        onSaved={() => void refresh()}
      />
      <DeleteServerModal server={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => void refresh()} />
    </main>
  );
}
