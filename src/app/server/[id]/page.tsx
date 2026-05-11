"use client";

import { useParams } from "next/navigation";
import { ServerWorkspaceGate } from "@/components/servers/ServerWorkspaceGate";

export default function ServerPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  if (!id) {
    return null;
  }
  return <ServerWorkspaceGate serverId={id} />;
}
