import type { SchoolClassRow, StudentScheduleBadge, StudentScheduleRow } from "@/lib/data/types";
import type { CalendarEvent } from "@/lib/dashboard/schedule-calendar-shared";
import {
  CATALOG_SLOT_META,
  SLOT_START_TIME,
  SLOT_TO_WEEKDAY,
  eventTypeFromBadgeTone,
  catalogSlotIdFromScheduleSlot,
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

function statusLabelForBadge(badge: StudentScheduleBadge): string {
  if (badge.tone === "core") return "School assigned";
  if (badge.tone === "approved") return "Approved";
  if (badge.tone === "pending") return "Pending approval";
  if (badge.tone === "waitlisted") return "Waitlisted";
  if (badge.tone === "draft") return "Draft choice";
  return "Open";
}

function slotLabel(slot: ParentScheduleSlotKey): string {
  const catalogSlot = catalogSlotIdFromScheduleSlot(slot);
  return catalogSlot ? CATALOG_SLOT_META[catalogSlot].label : slot;
}

export function studentScheduleToMonthEvents(row: StudentScheduleRow | null, classes: SchoolClassRow[] = []): Record<string, CalendarEvent[]> {
  if (!row) return {};
  const events: Record<string, CalendarEvent[]> = {};
  const byClassName = classMap(classes);
  const daysInMonth = new Date(FEB_2026.year, FEB_2026.monthIndex + 1, 0).getDate();
  for (const [slot, weekdays] of Object.entries(SLOT_TO_WEEKDAY) as [ParentScheduleSlotKey, number[]][]) {
    const badges = row[slot].filter((badge) => badge.tone !== "empty" && badge.label !== "--");
    if (!badges.length) continue;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = new Date(FEB_2026.year, FEB_2026.monthIndex, day);
      if (!weekdays.includes(d.getDay())) continue;
      for (const [index, badge] of badges.entries()) {
        const className = cleanClassName(badge.label);
        const details = byClassName.get(normalizedClassName(badge.label));
        addEvent(events, dateKey(FEB_2026.year, FEB_2026.monthIndex, day), {
          id: `${row.id}-${slot}-${day}-${index}`,
          time: SLOT_START_TIME[slot],
          title: className || badge.label,
          type: eventTypeFromBadgeTone(badge.tone),
          description: details?.description || `${row.name} · ${slotLabel(slot)}`,
          sortOrder: SLOT_DISPLAY_ORDER[slot] + index,
          classDetails: details,
          statusLabel: statusLabelForBadge(badge),
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
