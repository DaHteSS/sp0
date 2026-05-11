"use client";

import { useEffect, useId, useState } from "react";
import { Modal, MODAL_PANEL_CLASS } from "@/components/ui/Modal";

const STORAGE_KEY = "ssh-terminal-quick-cmds-v1";

export type QuickCommand = { id: string; label: string; command: string };

function load(): QuickCommand[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultCommands();
    const parsed = JSON.parse(raw) as QuickCommand[];
    return Array.isArray(parsed) && parsed.length ? parsed : defaultCommands();
  } catch {
    return defaultCommands();
  }
}

function defaultCommands(): QuickCommand[] {
  return [
    { id: "1", label: "List", command: "ls -la" },
    { id: "2", label: "Disk", command: "df -h" },
    { id: "3", label: "Processes", command: "ps aux | head -n 20" },
  ];
}

function save(cmds: QuickCommand[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cmds));
}

type Props = {
  disabled: boolean;
  onRun: (command: string) => void;
};

type CommandModal = null | { kind: "add" } | { kind: "edit"; id: string };

export function QuickCommands({ disabled, onRun }: Props) {
  const [items, setItems] = useState<QuickCommand[]>([]);
  const [editing, setEditing] = useState(false);
  const [commandModal, setCommandModal] = useState<CommandModal>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newCommand, setNewCommand] = useState("");
  const formTitleId = useId();
  const labelInputId = useId();
  const commandInputId = useId();

  useEffect(() => {
    setItems(load());
  }, []);

  const persist = (next: QuickCommand[]) => {
    setItems(next);
    save(next);
  };

  const openAdd = () => {
    setNewLabel("");
    setNewCommand("");
    setCommandModal({ kind: "add" });
  };

  const openEdit = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setNewLabel(item.label);
    setNewCommand(item.command);
    setCommandModal({ kind: "edit", id });
  };

  const closeForm = () => setCommandModal(null);

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newLabel.trim();
    const command = newCommand.trim();
    if (!label || !command || !commandModal) return;
    if (commandModal.kind === "add") {
      persist([...items, { id: crypto.randomUUID(), label, command }]);
    } else {
      persist(
        items.map((i) => (i.id === commandModal.id ? { ...i, label, command } : i)),
      );
    }
    closeForm();
  };

  const canSave = Boolean(newLabel.trim() && newCommand.trim());

  const remove = (id: string) => {
    persist(items.filter((i) => i.id !== id));
    setCommandModal((m) => (m?.kind === "edit" && m.id === id ? null : m));
  };

  const formOpen = commandModal !== null;
  const isEditModal = commandModal?.kind === "edit";

  return (
    <div className='flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--panel)] px-4 py-2'>
      <span className='text-xs uppercase tracking-wide text-[var(--muted)]'>Quick commands</span>
      {items.map((c) =>
        editing ? (
          <div
            key={c.id}
            className='inline-flex min-h-[1.75rem] max-w-full items-stretch overflow-hidden rounded border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--foreground)] shadow-sm'
          >
            <button
              type='button'
              onClick={() => openEdit(c.id)}
              className='min-w-0 flex-1 truncate px-2 py-1 text-left hover:bg-[var(--panel)]/60'
            >
              {c.label}
            </button>
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                remove(c.id);
              }}
              className='shrink-0 border-l border-[var(--border)] px-2 py-1 text-red-400 hover:bg-red-950/30'
              aria-label={`Delete ${c.label}`}
            >
              ×
            </button>
          </div>
        ) : (
          <button
            key={c.id}
            type='button'
            disabled={disabled}
            onClick={() => onRun(c.command)}
            className='rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--foreground)] hover:border-[var(--accent)] disabled:opacity-40'
          >
            {c.label}
          </button>
        ),
      )}
      <button
        type='button'
        onClick={() => setEditing(!editing)}
        className='text-xs text-[var(--muted)] hover:text-[var(--accent)]'
      >
        {editing ? "Done" : "Edit"}
      </button>
      <button type='button' onClick={openAdd} className='text-xs text-[var(--accent)] hover:underline'>
        + Add
      </button>

      <Modal open={formOpen} onClose={closeForm} titleId={formTitleId}>
        <form onSubmit={submitForm} className={MODAL_PANEL_CLASS}>
          <h2 id={formTitleId} className='mb-4 text-lg font-semibold text-[var(--foreground)]'>
            {isEditModal ? "Edit quick command" : "New quick command"}
          </h2>
          <label htmlFor={labelInputId} className='mb-1 block text-xs text-[var(--muted)]'>
            Button name
          </label>
          <input
            id={labelInputId}
            type='text'
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            autoComplete='off'
            className='mb-3 w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm text-[var(--foreground)]'
            autoFocus
          />
          <label htmlFor={commandInputId} className='mb-1 block text-xs text-[var(--muted)]'>
            Shell command (runs in the interactive terminal, uses the file browser folder as cwd)
          </label>
          <input
            id={commandInputId}
            type='text'
            value={newCommand}
            onChange={(e) => setNewCommand(e.target.value)}
            autoComplete='off'
            placeholder='ls -la'
            className='w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm text-[var(--foreground)]'
          />
          <div className='mt-6 flex justify-end gap-2'>
            <button
              type='button'
              onClick={closeForm}
              className='rounded border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--panel)]'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={!canSave}
              className='rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_-6px_rgba(226,102,245,0.45)] hover:opacity-90 disabled:opacity-50'
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
