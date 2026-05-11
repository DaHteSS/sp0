"use client";

import { useEffect, type ReactNode } from "react";

export const MODAL_PANEL_CLASS =
  "w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)]/95 p-6 shadow-[0_0_0_1px_rgba(226,102,245,0.06),0_24px_64px_-16px_rgba(0,0,0,0.65)] backdrop-blur-sm";

export const MODAL_FORM_PANEL_CLASS =
  "max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--panel)]/95 p-6 shadow-[0_0_0_1px_rgba(226,102,245,0.06),0_24px_64px_-16px_rgba(0,0,0,0.65)] backdrop-blur-sm";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  ariaDescribedBy?: string;
  children: ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
};

export function Modal({
  open,
  onClose,
  titleId,
  ariaDescribedBy,
  children,
  closeOnBackdrop = true,
  closeOnEscape = true,
}: ModalProps) {
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeOnEscape, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'
      role='dialog'
      aria-modal='true'
      aria-labelledby={titleId}
      {...(ariaDescribedBy ? { "aria-describedby": ariaDescribedBy } : {})}
      onMouseDown={(ev) => {
        if (closeOnBackdrop && ev.target === ev.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}
