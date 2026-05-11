import { NextResponse } from "next/server";
import { createServerBodySchema } from "@/lib/server-create-body-schema";
import { insertServer, listServers } from "@/server/server-db";
import type { StoredServerRecord } from "@/types/stored-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ servers: listServers() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to read server list" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = createServerBodySchema.safeParse(json);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? parsed.error.message;
      return NextResponse.json({ error: first }, { status: 400 });
    }
    const b = parsed.data;
    const record: StoredServerRecord = {
      name: b.name.trim(),
      iconId: b.iconId,
      host: b.host.trim(),
      port: b.port,
      username: b.username.trim(),
      useSshKey: b.useSshKey,
      password: b.useSshKey ? undefined : b.password,
      privateKey: b.useSshKey ? b.privateKey?.trim() : undefined,
      passphrase: b.useSshKey ? b.passphrase : undefined,
    };
    const id = insertServer(record);
    return NextResponse.json({ id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save server" }, { status: 500 });
  }
}
