"use client";

import { useState } from "react";
import { Modal, MODAL_PANEL_CLASS } from "@/components/ui/Modal";
import type { ServerListItem } from "@/types/stored-server";

type Props = {
  server: ServerListItem | null;
  onClose: () => void;
  onDeleted: () => void;
};

export function DeleteServerModal({ server, onClose, onDeleted }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  const confirm = async () => {
    if (!server) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/servers/${server.id}`, { method: "DELETE" });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          typeof data === "object" && data && "error" in data
            ? String((data as { error: unknown }).error)
            : "Failed to delete";
        setError(msg);
        return;
      }
      onDeleted();
      close();
    } catch {
      setError("Network unavailable");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={server !== null} onClose={close} titleId='delete-server-title'>
      {server ? (
        <div className={MODAL_PANEL_CLASS}>
          <h2 id='delete-server-title' className='mb-2 text-lg font-semibold text-[var(--foreground)]'>
            Delete connection?
          </h2>
          <p className='text-sm text-[var(--muted)]'>
            Will be deleted: <span className='font-medium text-[var(--foreground)]'>{server.name}</span>{" "}
            <span className='text-[var(--muted)]'>
              ({server.username}@{server.host}:{server.port})
            </span>
          </p>
          {error ? <p className='mt-3 text-sm text-red-400'>{error}</p> : null}
          <div className='mt-6 flex justify-end gap-2'>
            <button
              type='button'
              onClick={close}
              className='rounded border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--panel)]'
            >
              Cancel
            </button>
            <button
              type='button'
              onClick={() => void confirm()}
              disabled={busy}
              className='rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50'
            >
              {busy ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
