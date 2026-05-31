import type { DataSource } from "@/lib/data/fetch-source";
import type { CalendarEventType, ProgramTrack, ScheduleCalendarEvent, SemesterRow } from "@/lib/data/types";
import { requireAdminReadClient, type AdminReadClient } from "@/lib/api/admin-read";
import { isSupabaseConfigured } from "@/lib/data/env";
import { fetchSemestersResolved } from "@/lib/data/repositories/semesters";
import {
  classSchedulePartsFromFields,
  scheduleSlotForClassFields,
  SLOT_START_TIME,
  SLOT_TO_WEEKDAY,
  type ParentScheduleSlotKey,
} from "@/lib/schedule-slots";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ScheduleReadClient = Awaited<ReturnType<typeof createSupabaseServerClient>> | AdminReadClient;
type ScheduleQueryOptions = { semesterId?: string | null };

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

function dateOnlyToLocalDate(raw: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function nextDateOnly(raw: string): string {
  const d = dateOnlyToLocalDate(raw);
  return d ? toDateKey(addDays(d, 1)) : raw;
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
  const dayNumber = Number(lower.match(/\bday\s*([1-3])\b/)?.[1]);
  const dayIndexFromNumber = dayNumber === 1 ? 2 : dayNumber === 2 ? 3 : dayNumber === 3 ? 4 : null;
  const dayName = dayIndexFromNumber == null
    ? Object.keys(DAY_INDEX)
      .sort((a, b) => b.length - a.length)
      .find((day) => new RegExp(`\\b${day}\\b`, "i").test(lower))
    : null;
  const dayIndex = dayIndexFromNumber ?? (dayName ? DAY_INDEX[dayName] : null);
  if (dayIndex == null) return null;
  const afterSeparator = raw.split(/[·|,]/).slice(1).join(" ").trim() || raw;
  const firstTimeRange = afterSeparator.split(/\s+-\s+|–|—/)[0]?.trim() || afterSeparator;
  const canonical = classSchedulePartsFromFields({ scheduleSummary: raw });
  return {
    dayIndex,
    time: canonical.time === "Time not set" ? normalizeTimeLabel(firstTimeRange) : canonical.time,
  };
}

function classEventType(program: unknown): ScheduleCalendarEvent["type"] {
  return program === "core" ? "core" : "enrichment-approved";
}

function scheduleSlotsForClass(row: Record<string, unknown>): ParentScheduleSlotKey[] {
  return [scheduleSlotForClassFields({
    block: row.block,
    scheduleSummary: row.schedule_summary,
  })];
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

function buildClassScheduleEvents(
  rows: Record<string, unknown>[],
  semester: SemesterRow,
): Record<string, ScheduleCalendarEvent[]> {
  const start = dateOnlyToLocalDate(semester.startsOn);
  const end = dateOnlyToLocalDate(semester.endsOn);
  if (!start || !end) return {};
  const acc: Record<string, ScheduleCalendarEvent[]> = {};
  for (const row of rows) {
    const parsed = parseScheduleSummary(row.schedule_summary);
    const classId = String(row.id ?? "");
    const name = String(row.name ?? "").trim();
    if (!classId || !name) continue;
    const location = String(row.location ?? "").trim();
    const program = String(row.program ?? "") as ProgramTrack;
    const slots = scheduleSlotsForClass(row);
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const matchingSlot = slots.find((slot) => SLOT_TO_WEEKDAY[slot].includes(d.getDay()));
      if (!matchingSlot) continue;
      const dateKey = toDateKey(d);
      appendEvent(acc, dateKey, {
        id: `class-${classId}-${matchingSlot}-${dateKey}`,
        time: SLOT_START_TIME[matchingSlot] ?? parsed?.time ?? "",
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
  semester: SemesterRow | null;
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

async function resolveSemester(client: ScheduleReadClient, options?: ScheduleQueryOptions): Promise<SemesterRow | null> {
  const { semesters, currentSemester } = await fetchSemestersResolved(client);
  const explicit = options?.semesterId?.trim();
  if (explicit) return semesters.find((semester) => semester.id === explicit) ?? null;
  return currentSemester;
}

export async function fetchScheduleExtrasResolved(
  client?: ScheduleReadClient,
  options?: ScheduleQueryOptions,
): Promise<ScheduleExtrasResolved> {
  if (!isSupabaseConfigured()) {
    return {
      extrasByDate: {},
      semester: null,
      source: "unavailable",
    };
  }

  try {
    const supabase = client ?? await createSupabaseServerClient();
    const semester = await resolveSemester(supabase, options);
    if (!semester) {
      return {
        extrasByDate: {},
        semester: null,
        source: "unavailable",
      };
    }
    const { data, error } = await supabase
      .from("schedule_events")
      .select("id, title, starts_at, ends_at, location, class_id")
      .gte("starts_at", `${semester.startsOn}T00:00:00.000Z`)
      .lt("starts_at", `${nextDateOnly(semester.endsOn)}T00:00:00.000Z`)
      .order("starts_at", { ascending: true });

    if (error) {
      return {
        extrasByDate: {},
        semester: null,
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
      .select("id, name, program, block, schedule_summary, location, status")
      .eq("status", "active")
      .eq("semester_id", semester.id);

    return {
      extrasByDate: mergeByDate(buildClassScheduleEvents((classes ?? []) as Record<string, unknown>[], semester), scheduleEvents),
      semester,
      source: "remote",
    };
  } catch {
    return {
      extrasByDate: {},
      semester: null,
      source: "unavailable",
    };
  }
}

export async function fetchAdminScheduleExtrasResolved(options?: ScheduleQueryOptions): Promise<ScheduleExtrasResolved> {
  const access = await requireAdminReadClient();
  if (!access) {
    return {
      extrasByDate: {},
      semester: null,
      source: "unavailable",
    };
  }
  return fetchScheduleExtrasResolved(access.client, options);
}
