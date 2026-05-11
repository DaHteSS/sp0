"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SshWorkspace } from "@/components/ssh/SshWorkspace";
import type { ConnectPayload } from "@/types/ws-messages";
import type { ServerListItem } from "@/types/stored-server";

type Loaded = ServerListItem & { connect: ConnectPayload };

type Props = {
  serverId: string;
};

export function ServerWorkspaceGate({ serverId }: Props) {
  const router = useRouter();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/servers/${serverId}`);
      if (res.status === 404) {
        router.replace("/");
        return;
      }
      const json: unknown = await res.json();
      if (!res.ok) {
        setError(
          typeof json === "object" && json && "error" in json
            ? String((json as { error: unknown }).error)
            : "Error loading",
        );
        return;
      }
      const row = json as Loaded;
      setData(row);
    } catch {
      setError("Network unavailable");
    }
  }, [router, serverId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center gap-4 px-4'>
        <p className='text-sm text-red-400'>{error}</p>
        <Link href='/' className='text-sm text-[var(--accent)] hover:underline'>
          Back to home
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <p className='text-sm text-[var(--muted)]'>Loading profile…</p>
      </div>
    );
  }

  return (
    <SshWorkspace
      serverId={serverId}
      serverMeta={{ name: data.name, iconId: data.iconId }}
      hostLine={`${data.username}@${data.host}:${data.port}`}
      connectPayload={data.connect}
    />
  );
}
