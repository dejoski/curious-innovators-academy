/**
 * Shared weekday template + helpers for dashboard schedule UIs.
 * Remote rows from `schedule_events` merge on top via date key.
 */

import type { CalendarEventType, ScheduleCalendarEvent } from "@/lib/data/types";

export const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type { CalendarEventType };
export type CalendarEvent = ScheduleCalendarEvent;

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function cloneExtras(src: Record<string, CalendarEvent[]>): Record<string, CalendarEvent[]> {
  const out: Record<string, CalendarEvent[]> = {};
  for (const k of Object.keys(src)) {
    out[k] = [...src[k]];
  }
  return out;
}

export function typeLabel(type: CalendarEventType): string {
  const labels: Record<CalendarEventType, string> = {
    core: "Core (school assigned)",
    "enrichment-pending": "Enrichment pending",
    "enrichment-approved": "Enrichment approved",
    event: "Event",
  };
  return labels[type];
}
