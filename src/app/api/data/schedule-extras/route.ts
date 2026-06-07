import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { apiError, apiWriteError } from "@/lib/api/responses";
import { fetchScheduleExtrasResolved } from "@/lib/data/repositories/schedule";
import { serverInsertScheduleEvent } from "@/lib/data/server-writes";
import { parseBody } from "@/lib/api/route-factory";
import type { ScheduleCalendarEvent } from "@/lib/data/types";

export async function GET(request: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const { extrasByDate, semester, source } = await fetchScheduleExtrasResolved(undefined, {
    semesterId: searchParams.get("semesterId"),
  });
  return NextResponse.json({ extrasByDate, semester, source });
}

export async function POST(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = await parseBody(req);
  const eventDate = String(body.eventDate ?? "");
  const timeLabel = String(body.timeLabel ?? "");
  const title = String(body.title ?? "");
  const eventType = body.eventType as ScheduleCalendarEvent["type"];
  const description = body.description != null ? String(body.description) : undefined;
  if (!eventDate || !timeLabel || !title || !eventType) {
    return apiError("Missing fields");
  }
  const result = await serverInsertScheduleEvent({
    eventDate,
    timeLabel,
    title,
    eventType,
    description,
  });
  if (!result.ok) {
    return apiWriteError(result.message);
  }
  return NextResponse.json({ id: result.row.id });
}
