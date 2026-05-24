import type { CalendarEventType, StudentScheduleBadge, StudentScheduleRow } from "@/lib/data/types";

export type ParentScheduleSlotKey =
  | "b1"
  | "b2"
  | "b3Tue"
  | "b3Wed"
  | "b3Thu"
  | "b4Tue"
  | "b4Wed"
  | "b4Thu";

export type ParentScheduleBadges = Partial<Record<ParentScheduleSlotKey, StudentScheduleBadge[]>>;

export const CATALOG_SLOT_IDS = [
  "block3_day1",
  "block3_day2",
  "block3_day3",
  "block4_day1",
  "block4_day2",
  "block4_day3",
] as const;

export type CatalogSlotId = (typeof CATALOG_SLOT_IDS)[number];

export const PARENT_SCHEDULE_DAYS = ["Day 1", "Day 2", "Day 3"] as const;

export const PARENT_SCHEDULE_ROWS: {
  label: string;
  time: string;
  slots: [ParentScheduleSlotKey, ParentScheduleSlotKey, ParentScheduleSlotKey];
  tall?: boolean;
}[] = [
  { label: "Block 1", time: "7:00 - 8:30 am", slots: ["b1", "b1", "b1"] },
  { label: "Block 2", time: "8:40 - 10:10 am", slots: ["b2", "b2", "b2"] },
  { label: "Block 3", time: "10:20 - 11:50 am", slots: ["b3Tue", "b3Wed", "b3Thu"] },
  { label: "Block 4", time: "7:00 - 8:30 am", slots: ["b4Tue", "b4Wed", "b4Thu"], tall: true },
];

export const SLOT_TO_WEEKDAY: Record<ParentScheduleSlotKey, number[]> = {
  b1: [1, 2, 3, 4, 5],
  b2: [1, 2, 3, 4, 5],
  b3Tue: [2],
  b3Wed: [3],
  b3Thu: [4],
  b4Tue: [2],
  b4Wed: [3],
  b4Thu: [4],
};

export const SLOT_START_TIME: Record<ParentScheduleSlotKey, string> = {
  b1: "7:00 am",
  b2: "8:40 am",
  b3Tue: "10:20 am",
  b3Wed: "10:20 am",
  b3Thu: "10:20 am",
  b4Tue: "7:00 am",
  b4Wed: "7:00 am",
  b4Thu: "7:00 am",
};

export const CATALOG_SLOT_META: Record<
  CatalogSlotId,
  {
    title: string;
    block: string;
    level: string;
    time: string;
    overlayTime: string;
    scheduleSlot: ParentScheduleSlotKey;
    label: string;
  }
> = {
  block3_day1: {
    title: "Block 3 Day 1",
    block: "B3",
    level: "1",
    time: "10:20 - 11:50 am",
    overlayTime: "10:20 AM - 11:50 AM",
    scheduleSlot: "b3Tue",
    label: "Block 3 / Day 1",
  },
  block3_day2: {
    title: "Block 3 Day 2",
    block: "B3",
    level: "2",
    time: "10:20 - 11:50 am",
    overlayTime: "10:20 AM - 11:50 AM",
    scheduleSlot: "b3Wed",
    label: "Block 3 / Day 2",
  },
  block3_day3: {
    title: "Block 3 Day 3",
    block: "B3",
    level: "3",
    time: "10:20 - 11:50 am",
    overlayTime: "10:20 AM - 11:50 AM",
    scheduleSlot: "b3Thu",
    label: "Block 3 / Day 3",
  },
  block4_day1: {
    title: "Block 4 Day 1",
    block: "B4",
    level: "1",
    time: "7:00 - 8:30 am",
    overlayTime: "7:00 AM - 8:30 AM",
    scheduleSlot: "b4Tue",
    label: "Block 4 / Day 1",
  },
  block4_day2: {
    title: "Block 4 Day 2",
    block: "B4",
    level: "2",
    time: "7:00 - 8:30 am",
    overlayTime: "7:00 AM - 8:30 AM",
    scheduleSlot: "b4Wed",
    label: "Block 4 / Day 2",
  },
  block4_day3: {
    title: "Block 4 Day 3",
    block: "B4",
    level: "3",
    time: "7:00 - 8:30 am",
    overlayTime: "7:00 AM - 8:30 AM",
    scheduleSlot: "b4Thu",
    label: "Block 4 / Day 3",
  },
};

const SCHEDULE_SLOT_TO_CATALOG_SLOT: Partial<Record<ParentScheduleSlotKey, CatalogSlotId>> = {
  b3Tue: "block3_day1",
  b3Wed: "block3_day2",
  b3Thu: "block3_day3",
  b4Tue: "block4_day1",
  b4Wed: "block4_day2",
  b4Thu: "block4_day3",
};

export const EMPTY_SCHEDULE_BADGE: StudentScheduleBadge = { label: "--", tone: "empty" };

export function emptyScheduleBadgesBySlot(): Record<ParentScheduleSlotKey, StudentScheduleBadge[]> {
  return {
    b1: [{ ...EMPTY_SCHEDULE_BADGE }],
    b2: [{ ...EMPTY_SCHEDULE_BADGE }],
    b3Tue: [{ ...EMPTY_SCHEDULE_BADGE }],
    b3Wed: [{ ...EMPTY_SCHEDULE_BADGE }],
    b3Thu: [{ ...EMPTY_SCHEDULE_BADGE }],
    b4Tue: [{ ...EMPTY_SCHEDULE_BADGE }],
    b4Wed: [{ ...EMPTY_SCHEDULE_BADGE }],
    b4Thu: [{ ...EMPTY_SCHEDULE_BADGE }],
  };
}

export function catalogSlotIdFromScheduleSlot(slot: ParentScheduleSlotKey): CatalogSlotId | null {
  return SCHEDULE_SLOT_TO_CATALOG_SLOT[slot] ?? null;
}

export function isSelectableCatalogSlot(slot: ParentScheduleSlotKey): boolean {
  return catalogSlotIdFromScheduleSlot(slot) !== null;
}

export function eventTypeFromBadgeTone(tone: StudentScheduleBadge["tone"]): CalendarEventType {
  if (tone === "core") return "core";
  if (tone === "approved") return "enrichment-approved";
  if (tone === "pending") return "enrichment-pending";
  return "event";
}

export function splitScheduleLabel(schedule: string): { day: string; time: string } {
  const parts = schedule.split("·").map((part) => part.trim()).filter(Boolean);
  return {
    day: parts[0] || schedule || "Schedule not set",
    time: parts[1] || "Time not set",
  };
}

export function scheduleSlotForClassFields(input: {
  block?: unknown;
  scheduleSummary?: unknown;
  fallbackIndex?: number;
}): ParentScheduleSlotKey {
  const source = [input.block, input.scheduleSummary].filter(Boolean).join(" ").toLowerCase();
  const blockNumber = Number(source.match(/\bblock\s*([1-4])\b/)?.[1] ?? source.match(/\bb([1-4])\b/)?.[1]);
  const dayNumber = Number(source.match(/\bday\s*([1-3])\b/)?.[1]);
  const daySlot = dayNumber === 1 ? "Tue" : dayNumber === 2 ? "Wed" : dayNumber === 3 ? "Thu" : null;
  const index = input.fallbackIndex ?? 0;

  if (blockNumber === 1) return "b1";
  if (blockNumber === 2) return "b2";
  if (blockNumber === 4) return daySlot ? (`b4${daySlot}` as ParentScheduleSlotKey) : index % 3 === 0 ? "b4Tue" : index % 3 === 1 ? "b4Wed" : "b4Thu";
  if (blockNumber === 3) return daySlot ? (`b3${daySlot}` as ParentScheduleSlotKey) : index % 3 === 0 ? "b3Tue" : index % 3 === 1 ? "b3Wed" : "b3Thu";
  return index % 3 === 0 ? "b3Tue" : index % 3 === 1 ? "b3Wed" : "b3Thu";
}

export function studentScheduleSlots(row: StudentScheduleRow): Record<ParentScheduleSlotKey, StudentScheduleBadge[]> {
  return {
    b1: row.b1,
    b2: row.b2,
    b3Tue: row.b3Tue,
    b3Wed: row.b3Wed,
    b3Thu: row.b3Thu,
    b4Tue: row.b4Tue,
    b4Wed: row.b4Wed,
    b4Thu: row.b4Thu,
  };
}
