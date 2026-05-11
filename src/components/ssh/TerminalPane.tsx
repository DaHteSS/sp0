"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

type Props = {
  active: boolean;
  onData: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
  serverChunks: string[];
};

export function TerminalPane({ active, onData, onResize, serverChunks }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const chunkIndex = useRef(0);
  const onDataRef = useRef(onData);
  const onResizeRef = useRef(onResize);
  onDataRef.current = onData;
  onResizeRef.current = onResize;

  useLayoutEffect(() => {
    if (!active || !hostRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      theme: {
        background: "#131018",
        foreground: "#e8e4f0",
        cursor: "#e266f5",
        black: "#131018",
        red: "#fb7185",
        green: "#4ade80",
        yellow: "#fbbf24",
        blue: "#38bdf8",
        magenta: "#e879f9",
        cyan: "#2dd4bf",
        white: "#e8e4f0",
        brightBlack: "#5c566e",
        brightRed: "#fda4af",
        brightGreen: "#86efac",
        brightYellow: "#fde047",
        brightBlue: "#7dd3fc",
        brightMagenta: "#f0abfc",
        brightCyan: "#5eead4",
        brightWhite: "#ffffff",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    fit.fit();
    termRef.current = term;

    const sub = term.onData((d) => onDataRef.current(d));
    onResizeRef.current(term.cols, term.rows);

    const el = hostRef.current;
    const ro = new ResizeObserver(() => {
      fit.fit();
      onResizeRef.current(term.cols, term.rows);
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      sub.dispose();
      term.dispose();
      termRef.current = null;
      chunkIndex.current = 0;
    };
  }, [active]);

  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    while (chunkIndex.current < serverChunks.length) {
      term.write(serverChunks[chunkIndex.current]);
      chunkIndex.current += 1;
    }
  }, [serverChunks]);

  if (!active) {
    return (
      <div className='flex h-48 items-center justify-center border-t border-[var(--border)] bg-[var(--panel)]/50 text-sm text-[var(--muted)]'>
        Connect to the server to use the terminal
      </div>
    );
  }

  return <div ref={hostRef} className='h-56 min-h-[12rem] w-full border-t border-[var(--border)]' />;
}
