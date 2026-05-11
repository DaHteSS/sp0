"use client";

import { useCallback, useEffect, useState } from "react";
import { ServerGlyph } from "@/components/servers/ServerGlyph";
import { Modal, MODAL_FORM_PANEL_CLASS } from "@/components/ui/Modal";
import { SERVER_ICON_IDS, type ServerIconId } from "@/lib/server-icon-meta";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editId?: string | null;
};

export function AddServerModal({ open, onClose, onSaved, editId = null }: Props) {
  const [name, setName] = useState("");
  const [iconId, setIconId] = useState<ServerIconId>("server");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [useSshKey, setUseSshKey] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadBusy, setLoadBusy] = useState(false);

  const reset = useCallback(() => {
    setName("");
    setIconId("server");
    setHost("");
    setPort("22");
    setUsername("");
    setPassword("");
    setUseSshKey(false);
    setPrivateKey("");
    setPassphrase("");
    setError(null);
  }, []);

  useEffect(() => {
    if (!open || !editId) {
      setLoadBusy(false);
      return;
    }
    reset();
    let cancelled = false;
    setLoadBusy(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/servers/${editId}`);
        const data: unknown = await res.json();
        if (!res.ok || cancelled) {
          if (!cancelled) {
            const msg =
              typeof data === "object" && data && "error" in data
                ? String((data as { error: unknown }).error)
                : "Failed to load server";
            setError(msg);
            setLoadBusy(false);
          }
          return;
        }
        if (cancelled) return;
        const d = data as {
          name?: string;
          iconId?: string;
          host?: string;
          port?: number;
          username?: string;
          useSshKey?: boolean;
          connect?: { password?: string; privateKey?: string; passphrase?: string };
        };
        setName(typeof d.name === "string" ? d.name : "");
        const ic = typeof d.iconId === "string" && (SERVER_ICON_IDS as readonly string[]).includes(d.iconId);
        setIconId(ic ? (d.iconId as ServerIconId) : "server");
        setHost(typeof d.host === "string" ? d.host : "");
        setPort(typeof d.port === "number" ? String(d.port) : "22");
        setUsername(typeof d.username === "string" ? d.username : "");
        setUseSshKey(Boolean(d.useSshKey));
        const c = d.connect;
        setPassword(typeof c?.password === "string" ? c.password : "");
        setPrivateKey(typeof c?.privateKey === "string" ? c.privateKey : "");
        setPassphrase(typeof c?.passphrase === "string" ? c.passphrase : "");
        setLoadBusy(false);
      } catch {
        if (!cancelled) {
          setError("Network unavailable");
          setLoadBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, editId, reset]);

  const close = () => {
    reset();
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        iconId,
        host: host.trim(),
        port: parseInt(port, 10) || 22,
        username: username.trim(),
        useSshKey,
        password: useSshKey ? undefined : password,
        privateKey: useSshKey ? privateKey : undefined,
        passphrase: useSshKey ? passphrase : undefined,
      };
      const res = await fetch(editId ? `/api/servers/${editId}` : "/api/servers", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof data === "object" && data && "error" in data
            ? String((data as { error: unknown }).error)
            : "Save failed";
        setError(msg);
        return;
      }
      onSaved();
      close();
    } catch {
      setError("Network unavailable");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} titleId='add-server-title'>
      <form onSubmit={submit} className={MODAL_FORM_PANEL_CLASS}>
        <h2 id='add-server-title' className='mb-4 text-lg font-semibold text-[var(--foreground)]'>
          {editId ? "Edit connection" : "New connection"}
        </h2>

        {loadBusy ? <p className='mb-4 text-sm text-[var(--muted)]'>Loading…</p> : null}

        <div className={`flex flex-col gap-4 ${loadBusy ? "pointer-events-none opacity-50" : ""}`}>
          <label className='flex flex-col gap-1 text-xs text-[var(--muted)]'>
            Server name
            <input
              className='rounded border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm text-[var(--foreground)]'
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete='off'
            />
          </label>

          <div className='flex flex-col gap-2'>
            <span className='text-xs text-[var(--muted)]'>Select an icon</span>
            <div className='grid grid-cols-5 gap-2 sm:grid-cols-9'>
              {SERVER_ICON_IDS.map((id) => (
                <button
                  key={id}
                  type='button'
                  title={id}
                  onClick={() => setIconId(id)}
                  className={`flex h-10 items-center justify-center rounded border text-[var(--foreground)] transition-colors ${
                    iconId === id
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--border-hover)]"
                  }`}
                >
                  <ServerGlyph iconId={id} size={18} />
                </button>
              ))}
            </div>
          </div>

          <label className='flex flex-col gap-1 text-xs text-[var(--muted)]'>
            Host
            <input
              className='rounded border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm text-[var(--foreground)]'
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder='example.com'
              required
              autoComplete='off'
            />
          </label>

          <label className='flex flex-col gap-1 text-xs text-[var(--muted)]'>
            Port
            <input
              className='w-28 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm text-[var(--foreground)]'
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
          </label>

          <label className='flex flex-col gap-1 text-xs text-[var(--muted)]'>
            User
            <input
              className='rounded border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm text-[var(--foreground)]'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete='off'
            />
          </label>

          <label className='flex items-center gap-2 text-xs text-[var(--muted)]'>
            <input type='checkbox' checked={useSshKey} onChange={(e) => setUseSshKey(e.target.checked)} />
            Use SSH key
          </label>

          {!useSshKey ? (
            <label className='flex flex-col gap-1 text-xs text-[var(--muted)]'>
              Password
              <input
                type='password'
                className='rounded border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm text-[var(--foreground)]'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete='off'
              />
            </label>
          ) : (
            <>
              <label className='flex flex-col gap-1 text-xs text-[var(--muted)]'>
                Private key (PEM)
                <textarea
                  className='min-h-[88px] rounded border border-[var(--border)] bg-[var(--background)] px-2 py-2 font-mono text-xs text-[var(--foreground)]'
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder='-----BEGIN OPENSSH PRIVATE KEY-----'
                />
              </label>
              <label className='flex flex-col gap-1 text-xs text-[var(--muted)]'>
                Private key passphrase (if any)
                <input
                  type='password'
                  className='rounded border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm text-[var(--foreground)]'
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  autoComplete='off'
                />
              </label>
            </>
          )}

          {error ? <p className='text-sm text-red-400'>{error}</p> : null}
        </div>

        <div className='mt-6 flex justify-end gap-2'>
          <button
            type='button'
            onClick={close}
            className='rounded border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--panel)]'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={busy || loadBusy}
            className='rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_-6px_rgba(226,102,245,0.45)] hover:opacity-90 disabled:opacity-50'
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
