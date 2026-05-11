import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { decryptJson, encryptJson } from "@/lib/vault-crypto";
import { type ServerListItem, type StoredServerRecord, toConnectPayload } from "@/types/stored-server";
import type { ConnectPayload } from "@/types/ws-messages";

let db: Database.Database | null = null;

function getDbPath(): string {
  const dir = path.join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return path.join(dir, "servers.db");
}

export function getServerDb(): Database.Database {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS servers (
        id TEXT PRIMARY KEY NOT NULL,
        ciphertext BLOB NOT NULL
      );
    `);
  }
  return db;
}

export function listServers(): ServerListItem[] {
  const rows = getServerDb().prepare("SELECT id, ciphertext FROM servers ORDER BY rowid DESC").all() as {
    id: string;
    ciphertext: Buffer;
  }[];
  return rows.map((row) => {
    const rec = decryptJson<StoredServerRecord>(row.ciphertext);
    return {
      id: row.id,
      name: rec.name,
      iconId: rec.iconId,
      host: rec.host,
      port: rec.port,
      username: rec.username,
      useSshKey: rec.useSshKey,
    };
  });
}

export function getServer(id: string): { list: ServerListItem; connect: ConnectPayload } | null {
  const row = getServerDb().prepare("SELECT ciphertext FROM servers WHERE id = ?").get(id) as
    | { ciphertext: Buffer }
    | undefined;
  if (!row) return null;
  const rec = decryptJson<StoredServerRecord>(row.ciphertext);
  return {
    list: {
      id,
      name: rec.name,
      iconId: rec.iconId,
      host: rec.host,
      port: rec.port,
      username: rec.username,
      useSshKey: rec.useSshKey,
    },
    connect: toConnectPayload(rec),
  };
}

export function insertServer(record: StoredServerRecord): string {
  const id = randomUUID();
  const ciphertext = encryptJson(record);
  getServerDb().prepare("INSERT INTO servers (id, ciphertext) VALUES (?, ?)").run(id, ciphertext);
  return id;
}

export function updateServer(id: string, record: StoredServerRecord): boolean {
  const row = getServerDb().prepare("SELECT ciphertext FROM servers WHERE id = ?").get(id) as
    | { ciphertext: Buffer }
    | undefined;
  if (!row) return false;
  const ciphertext = encryptJson(record);
  getServerDb().prepare("UPDATE servers SET ciphertext = ? WHERE id = ?").run(ciphertext, id);
  return true;
}

export function deleteServer(id: string): boolean {
  const res = getServerDb().prepare("DELETE FROM servers WHERE id = ?").run(id);
  return res.changes > 0;
}
