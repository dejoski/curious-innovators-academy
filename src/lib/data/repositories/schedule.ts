import type { DataSource } from "@/lib/data/fetch-source";
import type { ScheduleCalendarEvent } from "@/lib/data/types";
import { isSupabaseConfigured } from "@/lib/data/env";
import { scheduleEventTypeFromDb } from "@/lib/data/mock/schedule-seed";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function parseIsoDateOnly(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const ymd = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}

function timeFromStartsAt(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.match(/T(\d{2}:\d{2})/);
  return t ? t[1] : null;
}

function mapScheduleRow(row: Record<string, unknown>): {
  dateKey: string;
  event: ScheduleCalendarEvent;
} | null {
  const startsAt =
    typeof row.starts_at === "string"
      ? row.starts_at
      : typeof row.ends_at === "string"
        ? row.ends_at
        : null;

  const dateKeyFromStart = startsAt ? parseIsoDateOnly(startsAt) : null;

  const dateKey =
    dateKeyFromStart ??
    parseIsoDateOnly(row.event_date) ??
    parseIsoDateOnly(row.date) ??
    parseIsoDateOnly(row.starts_on) ??
    parseIsoDateOnly(row.date_iso);

  if (!dateKey) return null;

  const idRaw = row.id ?? row.external_id;
  const id =
    idRaw != null
      ? String(idRaw)
      : `db-${dateKey}-${String(row.title ?? "").slice(0, 24)}`;

  const timeLabel =
    (startsAt ? timeFromStartsAt(startsAt) : null) ??
    String(row.time_label ?? row.time ?? "");

  const evt: ScheduleCalendarEvent = {
    id,
    time: timeLabel,
    title: String(row.title ?? ""),
    type: scheduleEventTypeFromDb(row.event_type ?? row.type),
    description:
      row.description != null
        ? String(row.description)
        : row.location != null
          ? String(row.location)
          : undefined,
  };

  return { dateKey, event: evt };
}

export type ScheduleExtrasResolved = {
  extrasByDate: Record<string, ScheduleCalendarEvent[]>;
  /** `fallback` when Supabase is missing or the query failed (weekday seed still renders). */
  source: DataSource;
};

/**
 * Extra calendar rows keyed by `yyyy-mm-dd`, merged with weekday seeds on the schedule page.
 * Table: `schedule_events` (starts_at / title / …).
 */
export async function fetchScheduleExtrasByDate(): Promise<
  Record<string, ScheduleCalendarEvent[]>
> {
  const { extrasByDate } = await fetchScheduleExtrasResolved();
  return extrasByDate;
}

export async function fetchScheduleExtrasResolved(): Promise<ScheduleExtrasResolved> {
  if (!isSupabaseConfigured()) {
    return { extrasByDate: {}, source: "fallback" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("schedule_events")
      .select("id, title, starts_at, ends_at, location, class_id")
      .order("starts_at", { ascending: true });

    if (error) {
      return { extrasByDate: {}, source: "fallback" };
    }

    if (!data?.length) {
      return { extrasByDate: {}, source: "remote" };
    }

    const acc: Record<string, ScheduleCalendarEvent[]> = {};

    for (const row of data) {
      const mapped = mapScheduleRow(row as unknown as Record<string, unknown>);
      if (!mapped) continue;
      const list = acc[mapped.dateKey] ?? [];
      list.push(mapped.event);
      acc[mapped.dateKey] = list;
    }

    return { extrasByDate: acc, source: "remote" };
  } catch {
    return { extrasByDate: {}, source: "fallback" };
  }
}
