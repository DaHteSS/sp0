"use client";

import type { LucideIcon } from "lucide-react";
import { Box, Cloud, Cpu, Database, Globe, HardDrive, Laptop, Monitor, Server } from "lucide-react";
import type { ServerIconId } from "@/lib/server-icon-meta";

const MAP: Record<ServerIconId, LucideIcon> = {
  server: Server,
  cloud: Cloud,
  hardDrive: HardDrive,
  database: Database,
  globe: Globe,
  cpu: Cpu,
  laptop: Laptop,
  monitor: Monitor,
  box: Box,
};

type Props = {
  iconId: string;
  className?: string;
  size?: number;
};

export function ServerGlyph({ iconId, className, size = 20 }: Props) {
  const Icon = (MAP[iconId as ServerIconId] ?? Server) as LucideIcon;
  return <Icon className={className} size={size} aria-hidden />;
}
