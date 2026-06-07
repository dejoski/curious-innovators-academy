import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { apiError, apiWriteError } from "@/lib/api/responses";
import { fetchNotificationsResolved } from "@/lib/data/repositories/notifications";
import { serverPatchNotificationRead, serverPatchNotificationsReadAll } from "@/lib/data/server-writes";
import { parseBody } from "@/lib/api/route-factory";

export async function GET(request: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { items: notifications, source } = await fetchNotificationsResolved();
  return NextResponse.json({ notifications, source });
}

export async function PATCH(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = await parseBody(req);
  if (body.scope === "all") {
    const ids = Array.isArray(body.ids) ? body.ids.map((id) => String(id)) : undefined;
    const result = await serverPatchNotificationsReadAll(ids);
    if (!result.ok) {
      return apiWriteError(result.message, 400);
    }
    return NextResponse.json({ ok: true });
  }
  const id = body.id != null ? String(body.id) : "";
  const read = Boolean(body.read);
  if (!id) {
    return apiError("Missing id");
  }
  const result = await serverPatchNotificationRead(id, read);
  if (!result.ok) {
    return apiWriteError(result.message, 400);
  }
  return NextResponse.json({ notification: result.row });
}
