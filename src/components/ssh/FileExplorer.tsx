"use client";

import { useState } from "react";
import { Modal, MODAL_PANEL_CLASS } from "@/components/ui/Modal";
import { joinRemote, parentPath } from "@/lib/paths";

export type DirEntry = {
  name: string;
  longname: string;
  isDirectory: boolean;
  size: number;
  mtime?: number;
};

type Props = {
  path: string;
  entries: DirEntry[];
  busy: boolean;
  onNavigate: (path: string) => void;
  onOpenFile: (path: string) => void;
  onDelete: (path: string, isDirectory: boolean) => void;
  onMkdir: () => void;
  onNewFile: () => void;
};

type DeleteTarget = { full: string; name: string; isDirectory: boolean };

export function FileExplorer({ path, entries, busy, onNavigate, onOpenFile, onDelete, onMkdir, onNewFile }: Props) {
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const sorted = [...entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const up = parentPath(path);

  const closeDeleteModal = () => setDeleteTarget(null);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    onDelete(deleteTarget.full, deleteTarget.isDirectory);
    closeDeleteModal();
  };

  return (
    <div className='flex h-full min-h-0 flex-col border-r border-[var(--border)] bg-[var(--panel)]'>
      <div className='flex flex-wrap items-center gap-2 border-b border-[var(--border)] p-2'>
        <button
          type='button'
          onClick={() => onNavigate(up)}
          disabled={busy || path === "/"}
          className='rounded px-2 py-1 text-xs text-[var(--accent)] hover:bg-[var(--background)] disabled:opacity-30'
        >
          ↑ Up
        </button>
        <button
          type='button'
          onClick={onMkdir}
          disabled={busy}
          className='rounded px-2 py-1 text-xs text-[var(--subtle)] hover:bg-[var(--background)] disabled:opacity-30'
        >
          New folder
        </button>
        <button
          type='button'
          onClick={onNewFile}
          disabled={busy}
          className='rounded px-2 py-1 text-xs text-[var(--subtle)] hover:bg-[var(--background)] disabled:opacity-30'
        >
          New file
        </button>
      </div>
      <div className='truncate border-b border-[var(--border)] px-2 py-1 font-mono text-xs text-[var(--muted)]' title={path}>
        {path}
      </div>
      <ul className='min-h-0 flex-1 overflow-auto text-sm'>
        {sorted.map((e) => {
          const full = joinRemote(path, e.name);
          return (
            <li
              key={full}
              className='flex items-center justify-between gap-2 border-b border-[var(--border)]/50 px-2 py-1.5 hover:bg-[var(--background)]'
            >
              <button
                type='button'
                className='min-w-0 flex-1 truncate text-left text-[var(--foreground)]'
                onClick={() => (e.isDirectory ? onNavigate(full) : onOpenFile(full))}
              >
                <span className='mr-2'>{e.isDirectory ? "📁" : "📄"}</span>
                <span className='font-mono text-xs'>{e.name}</span>
                {!e.isDirectory ? <span className='ml-2 text-xs text-[var(--muted)]'>{formatSize(e.size)}</span> : null}
              </button>
              <button
                type='button'
                className='shrink-0 text-xs text-red-400 hover:underline disabled:opacity-30'
                disabled={busy}
                onClick={(ev) => {
                  ev.stopPropagation();
                  setDeleteTarget({ full, name: e.name, isDirectory: e.isDirectory });
                }}
              >
                Delete
              </button>
            </li>
          );
        })}
        {!sorted.length ? <li className='px-2 py-4 text-center text-xs text-[var(--muted)]'>Empty</li> : null}
      </ul>

      <Modal open={deleteTarget !== null} onClose={closeDeleteModal} titleId='delete-file-title'>
        {deleteTarget ? (
          <div className={MODAL_PANEL_CLASS}>
            <h2 id='delete-file-title' className='mb-2 text-lg font-semibold text-[var(--foreground)]'>
              Delete {deleteTarget.isDirectory ? "folder" : "file"}?
            </h2>
            <p className='text-sm text-[var(--muted)]'>
              This will permanently remove{" "}
              <span className='font-medium font-mono text-[var(--foreground)]'>{deleteTarget.name}</span>.
            </p>
            <div className='mt-6 flex justify-end gap-2'>
              <button
                type='button'
                onClick={closeDeleteModal}
                className='rounded border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--panel)]'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={confirmDelete}
                disabled={busy}
                className='rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50'
              >
                Delete
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
