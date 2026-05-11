import { NextResponse } from "next/server";
import { createServerBodySchema } from "@/lib/server-create-body-schema";
import { deleteServer, getServer, updateServer } from "@/server/server-db";
import type { StoredServerRecord } from "@/types/stored-server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const row = getServer(id);
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      ...row.list,
      connect: row.connect,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load server" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const existing = getServer(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
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
    const ok = updateServer(id, record);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update server" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const ok = deleteServer(id);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete server" }, { status: 500 });
  }
}
