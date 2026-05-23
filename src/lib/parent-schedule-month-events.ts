import type { StudentScheduleRow } from "@/lib/data/types";
import type { CalendarEvent } from "@/lib/dashboard/schedule-calendar-shared";
import {
  SLOT_START_TIME,
  SLOT_TO_WEEKDAY,
  eventTypeFromBadgeTone,
  type ParentScheduleSlotKey,
} from "@/lib/schedule-slots";

const FEB_2026 = { year: 2026, monthIndex: 1 };

const SLOT_DISPLAY_ORDER: Record<ParentScheduleSlotKey, number> = {
  b1: 10,
  b2: 20,
  b3Tue: 30,
  b3Wed: 30,
  b3Thu: 30,
  b4Tue: 40,
  b4Wed: 40,
  b4Thu: 40,
};

function dateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addEvent(target: Record<string, CalendarEvent[]>, key: string, event: CalendarEvent) {
  target[key] = [...(target[key] ?? []), event];
}

export function studentScheduleToMonthEvents(row: StudentScheduleRow | null): Record<string, CalendarEvent[]> {
  if (!row) return {};
  const events: Record<string, CalendarEvent[]> = {};
  const daysInMonth = new Date(FEB_2026.year, FEB_2026.monthIndex + 1, 0).getDate();
  for (const [slot, weekdays] of Object.entries(SLOT_TO_WEEKDAY) as [ParentScheduleSlotKey, number[]][]) {
    const badges = row[slot].filter((badge) => badge.tone !== "empty" && badge.label !== "--");
    if (!badges.length) continue;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = new Date(FEB_2026.year, FEB_2026.monthIndex, day);
      if (!weekdays.includes(d.getDay())) continue;
      for (const [index, badge] of badges.entries()) {
        addEvent(events, dateKey(FEB_2026.year, FEB_2026.monthIndex, day), {
          id: `${row.id}-${slot}-${day}-${index}`,
          time: SLOT_START_TIME[slot],
          title: badge.label,
          type: eventTypeFromBadgeTone(badge.tone),
          description: `${row.name} · ${slot}`,
          sortOrder: SLOT_DISPLAY_ORDER[slot] + index,
        });
      }
    }
  }
  return events;
}

export function mergeCalendarEvents(...sources: Record<string, CalendarEvent[]>[]) {
  const merged: Record<string, CalendarEvent[]> = {};
  for (const source of sources) {
    for (const [key, events] of Object.entries(source)) {
      merged[key] = [...(merged[key] ?? []), ...events];
    }
  }
  return merged;
}
