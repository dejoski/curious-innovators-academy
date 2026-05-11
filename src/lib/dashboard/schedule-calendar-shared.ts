/**
 * Shared weekday template + helpers for dashboard schedule UIs (Figma-aligned variants).
 * Remote rows from `schedule_events` merge on top via date key.
 */

export const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type CalendarEventType =
  | "core"
  | "enrichment-pending"
  | "enrichment-approved"
  | "event";

export type CalendarEvent = {
  id: string;
  time: string;
  title: string;
  type: CalendarEventType;
  description?: string;
};

const SEED_BY_WEEKDAY: Record<number, Omit<CalendarEvent, "id">[]> = {
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

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function seedEventsForDate(date: Date): CalendarEvent[] {
  const dayOfWeek = date.getDay();
  const isFirstSaturday = dayOfWeek === 6 && date.getDate() <= 7;
  const templates =
    SEED_BY_WEEKDAY[dayOfWeek] ??
    (isFirstSaturday
      ? [
          {
            time: "1:00 pm",
            title: "Parent Meeting",
            type: "event" as const,
            description: "All-school parent information session.",
          },
        ]
      : []);
  return templates.map((t, i) => ({
    ...t,
    id: `seed-${toDateKey(date)}-${dayOfWeek}-${i}`,
  }));
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
