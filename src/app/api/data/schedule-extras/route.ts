import { NextResponse } from "next/server";
import { fetchScheduleExtrasResolved } from "@/lib/data/repositories/schedule";
import { serverInsertScheduleEvent } from "@/lib/data/server-writes";
import type { ScheduleCalendarEvent } from "@/lib/data/types";

export async function GET() {
  const { extrasByDate, source } = await fetchScheduleExtrasResolved();
  return NextResponse.json({ extrasByDate, source });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  const eventDate = String(body.eventDate ?? "");
  const timeLabel = String(body.timeLabel ?? "");
  const title = String(body.title ?? "");
  const eventType = body.eventType as ScheduleCalendarEvent["type"];
  const description = body.description != null ? String(body.description) : undefined;
  if (!eventDate || !timeLabel || !title || !eventType) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const result = await serverInsertScheduleEvent({
    eventDate,
    timeLabel,
    title,
    eventType,
    description,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ id: result.row.id });
}
