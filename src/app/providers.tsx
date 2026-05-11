"use client";

import type { ReactNode } from "react";
import { SshConnectionsProvider } from "@/context/ssh-connections-context";

export function AppProviders({ children }: { children: ReactNode }) {
  return <SshConnectionsProvider>{children}</SshConnectionsProvider>;
}
