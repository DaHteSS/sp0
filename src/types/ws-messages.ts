import { z } from "zod";

export const connectPayloadSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535).default(22),
  username: z.string().min(1),
  password: z.string().optional(),
  privateKey: z.string().optional(),
  passphrase: z.string().optional(),
});

export type ConnectPayload = z.infer<typeof connectPayloadSchema>;

export type ClientMessage =
  | { type: "connect"; payload: ConnectPayload }
  | { type: "terminal-input"; data: string }
  | { type: "terminal-resize"; cols: number; rows: number }
  | { type: "sftp-list"; path: string }
  | { type: "sftp-read-file"; path: string }
  | { type: "sftp-write-file"; path: string; content: string }
  | { type: "sftp-delete"; path: string; isDirectory: boolean }
  | { type: "sftp-mkdir"; path: string }
  | { type: "exec"; command: string; cwd?: string };

export type ServerMessage =
  | { type: "connected" }
  | { type: "terminal"; data: string }
  | { type: "shell-cwd"; path: string }
  | { type: "terminal-closed"; code?: number; signal?: string }
  | {
      type: "sftp-list";
      path: string;
      entries: { name: string; longname: string; isDirectory: boolean; size: number; mtime?: number }[];
    }
  | { type: "file-content"; path: string; content: string }
  | { type: "exec-result"; command: string; stdout: string; stderr: string; code: number | null }
  | { type: "error"; message: string }
  | { type: "info"; message: string };
