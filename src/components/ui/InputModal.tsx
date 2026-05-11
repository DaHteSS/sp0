"use client";

import { useEffect, useId, useState } from "react";
import { Modal, MODAL_PANEL_CLASS } from "@/components/ui/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  onSave: (value: string) => void;
  saveLabel?: string;
  cancelLabel?: string;
};

export function InputModal({
  open,
  onClose,
  title,
  label,
  placeholder,
  initialValue = "",
  onSave,
  saveLabel = "Save",
  cancelLabel = "Cancel",
}: Props) {
  const titleId = useId();
  const inputId = useId();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  const close = () => onClose();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = value.trim();
    if (!t) return;
    onSave(t);
    close();
  };

  const canSave = Boolean(value.trim());

  return (
    <Modal open={open} onClose={close} titleId={titleId}>
      <form onSubmit={submit} className={MODAL_PANEL_CLASS}>
        <h2 id={titleId} className='mb-4 text-lg font-semibold text-[var(--foreground)]'>
          {title}
        </h2>
        {label ? (
          <label htmlFor={inputId} className='mb-1 block text-xs text-[var(--muted)]'>
            {label}
          </label>
        ) : null}
        <input
          id={inputId}
          type='text'
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoComplete='off'
          className='w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm text-[var(--foreground)]'
          autoFocus
        />
        <div className='mt-6 flex justify-end gap-2'>
          <button
            type='button'
            onClick={close}
            className='rounded border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--panel)]'
          >
            {cancelLabel}
          </button>
          <button
            type='submit'
            disabled={!canSave}
            className='rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_-6px_rgba(226,102,245,0.45)] hover:opacity-90 disabled:opacity-50'
          >
            {saveLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
