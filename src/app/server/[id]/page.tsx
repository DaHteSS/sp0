"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ServerWorkspaceGate } from "@/components/servers/ServerWorkspaceGate";

export default function ServerPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  if (!id) {
    return (
      <main id='main-content' className='flex min-h-screen flex-col items-center justify-center gap-4 px-4'>
        <p className='text-sm text-[var(--muted)]'>Incorrect server address</p>
        <Link href='/' className='text-sm text-[var(--accent)] hover:underline'>
          Back to server list
        </Link>
      </main>
    );
  }

  return <ServerWorkspaceGate serverId={id} />;
}
