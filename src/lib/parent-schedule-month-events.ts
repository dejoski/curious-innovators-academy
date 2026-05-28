import type { SchoolClassRow, StudentScheduleRow } from "@/lib/data/types";
import type { CalendarEvent } from "@/lib/dashboard/schedule-calendar-shared";
import {
  CATALOG_SLOT_META,
  PARENT_SCHEDULE_SLOT_DISPLAY_ORDER,
  SLOT_START_TIME,
  SLOT_TO_WEEKDAY,
  eventTypeFromBadgeTone,
  catalogSlotIdFromScheduleSlot,
  scheduleBadgeStatusLabel,
  type ParentScheduleSlotKey,
} from "@/lib/schedule-slots";

function dateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthFromDate(baseDate: Date) {
  return {
    year: baseDate.getFullYear(),
    monthIndex: baseDate.getMonth(),
  };
}

function addEvent(target: Record<string, CalendarEvent[]>, key: string, event: CalendarEvent) {
  target[key] = [...(target[key] ?? []), event];
}

function normalizedClassName(label: string): string {
  return label
    .replace(/^Rejected 2nd:\s*/i, "")
    .replace(/^Rejected:\s*/i, "")
    .replace(/^2nd:\s*/i, "")
    .replace(/\s+-\s+(Core|Enrichment)$/i, "")
    .trim()
    .toLowerCase();
}

function cleanClassName(label: string): string {
  return label
    .replace(/^Rejected 2nd:\s*/i, "")
    .replace(/^Rejected:\s*/i, "")
    .replace(/^2nd:\s*/i, "")
    .replace(/\s+-\s+(Core|Enrichment)$/i, "")
    .trim();
}

function classMap(classes: SchoolClassRow[] = []) {
  return new Map(classes.map((row) => [normalizedClassName(row.name), row]));
}

function slotLabel(slot: ParentScheduleSlotKey): string {
  const catalogSlot = catalogSlotIdFromScheduleSlot(slot);
  if (catalogSlot) return CATALOG_SLOT_META[catalogSlot].label;
  if (slot === "b1") return "Block 1";
  if (slot === "b2") return "Block 2";
  return slot;
}

export function studentScheduleToMonthEvents(
  row: StudentScheduleRow | null,
  classes: SchoolClassRow[] = [],
  baseDate: Date = new Date(),
): Record<string, CalendarEvent[]> {
  if (!row) return {};
  const events: Record<string, CalendarEvent[]> = {};
  const byClassName = classMap(classes);
  const scheduleMonth = monthFromDate(baseDate);
  const daysInMonth = new Date(scheduleMonth.year, scheduleMonth.monthIndex + 1, 0).getDate();
  for (const [slot, weekdays] of Object.entries(SLOT_TO_WEEKDAY) as [ParentScheduleSlotKey, number[]][]) {
    const badges = row[slot].filter((badge) => badge.tone !== "empty" && badge.label !== "--");
    if (!badges.length) continue;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = new Date(scheduleMonth.year, scheduleMonth.monthIndex, day);
      if (!weekdays.includes(d.getDay())) continue;
      for (const [index, badge] of badges.entries()) {
        const className = cleanClassName(badge.label);
        const details = byClassName.get(normalizedClassName(badge.label));
        addEvent(events, dateKey(scheduleMonth.year, scheduleMonth.monthIndex, day), {
          id: `${row.id}-${slot}-${day}-${index}`,
          time: SLOT_START_TIME[slot],
          title: className || badge.label,
          type: eventTypeFromBadgeTone(badge.tone),
          description: details?.description || `${row.name} · ${slotLabel(slot)}`,
          sortOrder: PARENT_SCHEDULE_SLOT_DISPLAY_ORDER[slot] + index,
          classDetails: details,
          statusLabel: scheduleBadgeStatusLabel(badge, "calendar"),
          scheduleSlotLabel: slotLabel(slot),
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
