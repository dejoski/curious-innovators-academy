import type { CalendarEventType, ScheduleCalendarEvent } from "@/lib/data/types";

/** Weekday seeds (0=Sun … 6=Sat) reused by /dashboard/schedule. */
export const SCHEDULE_SEED_BY_WEEKDAY: Record<
  number,
  Omit<ScheduleCalendarEvent, "id">[]
> = {
  1: [
    {
      time: "7:00 am",
      title: "Math - Core",
      type: "core",
      description: "Core mathematics block assigned by the school.",
    },
    {
      time: "8:30 am",
      title: "ELA - Core",
      type: "core",
      description: "English language arts core session.",
    },
    {
      time: "10:00 am",
      title: "Youth Entrepreneurship - Enrichment",
      type: "enrichment-pending",
      description: "Enrichment pending coordinator approval.",
    },
    {
      time: "3:00 pm",
      title: "Economics & Financial Literacy- Enrichment",
      type: "enrichment-approved",
      description: "Approved enrichment elective.",
    },
  ],
  3: [
    {
      time: "7:00 am",
      title: "Math - Core",
      type: "core",
      description: "Core mathematics block assigned by the school.",
    },
    {
      time: "8:30 am",
      title: "ELA - Core",
      type: "core",
      description: "English language arts core session.",
    },
    {
      time: "10:00 am",
      title: "Ocean Explorers - Enrichment",
      type: "enrichment-pending",
      description: "Enrichment pending coordinator approval.",
    },
    {
      time: "3:00 pm",
      title: "Health Sciences Lab- Enrichment",
      type: "enrichment-approved",
      description: "Approved enrichment elective.",
    },
  ],
  4: [
    {
      time: "7:00 am",
      title: "Math - Core",
      type: "core",
      description: "Core mathematics block assigned by the school.",
    },
    {
      time: "8:30 am",
      title: "ELA - Core",
      type: "core",
      description: "English language arts core session.",
    },
    {
      time: "10:00 am",
      title: "Creative Writing & Storytelling - Enrichment",
      type: "enrichment-pending",
      description: "Enrichment pending coordinator approval.",
    },
    {
      time: "3:00 pm",
      title: "Journalism & Media Writing - Enrichment",
      type: "enrichment-approved",
      description: "Approved enrichment elective.",
    },
  ],
};

const EVENT_TYPES: CalendarEventType[] = [
  "core",
  "enrichment-pending",
  "enrichment-approved",
  "event",
];

function isCalendarEventType(v: string): v is CalendarEventType {
  return (EVENT_TYPES as string[]).includes(v);
}

export function scheduleEventTypeFromDb(value: unknown): CalendarEventType {
  const s = String(value ?? "");
  return isCalendarEventType(s) ? s : "event";
}
