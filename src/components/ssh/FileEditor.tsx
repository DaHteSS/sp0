"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type Props = {
  path: string | null;
  content: string;
  dirty: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  disabled: boolean;
};

function guessLang(p: string | null): string {
  if (!p) return "plaintext";
  const ext = p.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    md: "markdown",
    py: "python",
    rs: "rust",
    go: "go",
    yml: "yaml",
    yaml: "yaml",
    sh: "shell",
    bash: "shell",
    html: "html",
    css: "css",
    scss: "scss",
  };
  return map[ext] ?? "plaintext";
}

export function FileEditor({ path, content, dirty, onChange, onSave, disabled }: Props) {
  const language = useMemo(() => guessLang(path), [path]);

  if (!path) {
    return (
      <div className='flex h-full min-h-[200px] items-center justify-center bg-[var(--panel)] text-sm text-[var(--muted)]'>
        Select a file in the tree or create a new one
      </div>
    );
  }

  return (
    <div className='flex h-full min-h-[200px] flex-col md:min-h-0'>
      <div className='flex items-center gap-3 border-b border-[var(--border)] bg-[var(--panel)] px-3 py-2'>
        <span className='min-w-0 flex-1 truncate font-mono text-xs text-[var(--muted)]' title={path}>
          {path}
          {dirty ? <span className='ml-2 text-amber-400'>●</span> : null}
        </span>
        <button
          type='button'
          disabled={disabled || !dirty}
          onClick={onSave}
          className='rounded bg-emerald-700 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-40'
        >
          Save
        </button>
      </div>
      <div className='min-h-0 flex-1'>
        <Monaco
          height='100%'
          theme='vs-dark'
          language={language}
          value={content}
          onChange={(v) => onChange(v ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            readOnly: disabled,
          }}
        />
      </div>
    </div>
  );
}
