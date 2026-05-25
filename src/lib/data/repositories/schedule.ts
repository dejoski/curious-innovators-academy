import type { DataSource } from "@/lib/data/fetch-source";
import type { CalendarEventType, ProgramTrack, ScheduleCalendarEvent } from "@/lib/data/types";
import { isSupabaseConfigured } from "@/lib/data/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

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

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function defaultScheduleWindow(): { start: Date; end: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    start: addDays(today, -35),
    end: addDays(today, 180),
  };
}

function appendEvent(
  acc: Record<string, ScheduleCalendarEvent[]>,
  dateKey: string,
  event: ScheduleCalendarEvent,
) {
  const list = acc[dateKey] ?? [];
  list.push(event);
  acc[dateKey] = list;
}

function normalizeTimeLabel(raw: string): string {
  const match = raw.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (!match) return raw.trim();
  const hour = Number(match[1]);
  const minute = match[2] ?? "00";
  const suffix = match[3]?.toLowerCase() ?? "";
  return `${hour}:${minute} ${suffix}`;
}

function parseScheduleSummary(summary: unknown): { dayIndex: number; time: string } | null {
  const raw = String(summary ?? "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const dayName = Object.keys(DAY_INDEX)
    .sort((a, b) => b.length - a.length)
    .find((day) => new RegExp(`\\b${day}\\b`, "i").test(lower));
  if (!dayName) return null;
  const afterSeparator = raw.split(/[·|,]/).slice(1).join(" ").trim() || raw;
  const firstTimeRange = afterSeparator.split(/\s+-\s+|–|—/)[0]?.trim() || afterSeparator;
  return {
    dayIndex: DAY_INDEX[dayName],
    time: normalizeTimeLabel(firstTimeRange),
  };
}

function classEventType(program: unknown): ScheduleCalendarEvent["type"] {
  return program === "core" ? "core" : "enrichment-approved";
}

const EVENT_TYPES: CalendarEventType[] = [
  "core",
  "enrichment-pending",
  "enrichment-approved",
  "event",
];

function isCalendarEventType(value: string): value is CalendarEventType {
  return (EVENT_TYPES as string[]).includes(value);
}

function scheduleEventTypeFromDb(value: unknown): CalendarEventType {
  const s = String(value ?? "");
  return isCalendarEventType(s) ? s : "event";
}

function buildClassScheduleEvents(rows: Record<string, unknown>[]): Record<string, ScheduleCalendarEvent[]> {
  const { start, end } = defaultScheduleWindow();
  const acc: Record<string, ScheduleCalendarEvent[]> = {};
  for (const row of rows) {
    const parsed = parseScheduleSummary(row.schedule_summary);
    if (!parsed) continue;
    const classId = String(row.id ?? "");
    const name = String(row.name ?? "").trim();
    if (!classId || !name) continue;
    const location = String(row.location ?? "").trim();
    const program = String(row.program ?? "") as ProgramTrack;
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      if (d.getDay() !== parsed.dayIndex) continue;
      const dateKey = toDateKey(d);
      appendEvent(acc, dateKey, {
        id: `class-${classId}-${dateKey}`,
        time: parsed.time,
        title: name,
        type: classEventType(program),
        description: location
          ? `${String(row.schedule_summary ?? "").trim()} · ${location}`
          : String(row.schedule_summary ?? "").trim() || undefined,
      });
    }
  }
  return acc;
}

function mergeByDate(
  ...sources: Record<string, ScheduleCalendarEvent[]>[]
): Record<string, ScheduleCalendarEvent[]> {
  const merged: Record<string, ScheduleCalendarEvent[]> = {};
  for (const source of sources) {
    for (const [dateKey, events] of Object.entries(source)) {
      const list = merged[dateKey] ?? [];
      list.push(...events);
      merged[dateKey] = list;
    }
  }
  for (const dateKey of Object.keys(merged)) {
    merged[dateKey].sort((a, b) => a.time.localeCompare(b.time));
  }
  return merged;
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
    return {
      extrasByDate: {},
      source: "unavailable",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("schedule_events")
      .select("id, title, starts_at, ends_at, location, class_id")
      .order("starts_at", { ascending: true });

    if (error) {
      return {
        extrasByDate: {},
        source: "unavailable",
      };
    }

    const scheduleEvents: Record<string, ScheduleCalendarEvent[]> = {};

    for (const row of data ?? []) {
      const mapped = mapScheduleRow(row as unknown as Record<string, unknown>);
      if (!mapped) continue;
      appendEvent(scheduleEvents, mapped.dateKey, mapped.event);
    }

    const { data: classes } = await supabase
      .from("classes")
      .select("id, name, program, schedule_summary, location, status")
      .eq("status", "active");

    return {
      extrasByDate: mergeByDate(buildClassScheduleEvents((classes ?? []) as Record<string, unknown>[]), scheduleEvents),
      source: "remote",
    };
  } catch {
    return {
      extrasByDate: {},
      source: "unavailable",
    };
  }
}
