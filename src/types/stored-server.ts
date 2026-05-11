import type { ConnectPayload } from "@/types/ws-messages";

export type StoredServerRecord = {
  name: string;
  iconId: string;
  host: string;
  port: number;
  username: string;
  useSshKey: boolean;
  password?: string;
  privateKey?: string;
  passphrase?: string;
};

export type ServerListItem = {
  id: string;
  name: string;
  iconId: string;
  host: string;
  port: number;
  username: string;
  useSshKey: boolean;
};

export function toConnectPayload(record: StoredServerRecord): ConnectPayload {
  return {
    host: record.host,
    port: record.port,
    username: record.username,
    password: record.useSshKey ? undefined : record.password,
    privateKey: record.useSshKey ? record.privateKey : undefined,
    passphrase: record.useSshKey && record.passphrase && record.passphrase.length > 0 ? record.passphrase : undefined,
  };
}
