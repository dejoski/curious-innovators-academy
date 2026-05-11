import { NextResponse } from "next/server";
import { fetchNotificationsResolved } from "@/lib/data/repositories/notifications";
import {
  serverPatchNotificationRead,
  serverPatchNotificationsReadAll,
} from "@/lib/data/server-writes";

export async function GET() {
  const { items: notifications, source } = await fetchNotificationsResolved();
  return NextResponse.json({ notifications, source });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  if (body.scope === "all") {
    const result = await serverPatchNotificationsReadAll();
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }
  const id = body.id != null ? String(body.id) : "";
  const read = Boolean(body.read);
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const result = await serverPatchNotificationRead(id, read);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ notification: result.row });
}
