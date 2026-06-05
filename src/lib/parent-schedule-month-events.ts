import type { SchoolClassRow, SemesterRow, StudentScheduleRow } from "@/lib/data/types";
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

function dateOnlyToLocalDate(raw: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
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
  if (slot.startsWith("b1")) return "Block 1";
  if (slot.startsWith("b2")) return "Block 2";
  return slot;
}

export function studentScheduleToMonthEvents(
  row: StudentScheduleRow | null,
  classes: SchoolClassRow[] = [],
  semester?: SemesterRow | null,
): Record<string, CalendarEvent[]> {
  if (!row) return {};
  const start = semester ? dateOnlyToLocalDate(semester.startsOn) : null;
  const end = semester ? dateOnlyToLocalDate(semester.endsOn) : null;
  if (!start || !end) return {};
  const events: Record<string, CalendarEvent[]> = {};
  const byClassName = classMap(classes);
  for (const [slot, weekdays] of Object.entries(SLOT_TO_WEEKDAY) as [ParentScheduleSlotKey, number[]][]) {
    const badges = row[slot].filter((badge) => badge.tone !== "empty" && badge.label !== "--");
    if (!badges.length) continue;
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      if (!weekdays.includes(d.getDay())) continue;
      for (const [index, badge] of badges.entries()) {
        const className = cleanClassName(badge.label);
        const details = byClassName.get(normalizedClassName(badge.label));
        const displaySlot = slotLabel(slot);
        addEvent(events, dateKey(d.getFullYear(), d.getMonth(), d.getDate()), {
          id: `${row.id}-${slot}-${dateKey(d.getFullYear(), d.getMonth(), d.getDate())}-${index}`,
          time: SLOT_START_TIME[slot],
          title: className || badge.label,
          type: eventTypeFromBadgeTone(badge.tone),
          description: `${displaySlot} · ${SLOT_START_TIME[slot]} · ${row.name}`,
          sortOrder: PARENT_SCHEDULE_SLOT_DISPLAY_ORDER[slot] + index,
          classDetails: details,
          statusLabel: scheduleBadgeStatusLabel(badge, "calendar"),
          scheduleSlotLabel: displaySlot,
        });
      }
    }
  }
  return events;
}
