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

export const PARENT_SCHEDULE_SLOT_KEYS: ParentScheduleSlotKey[] = ["b1", "b2", "b3Tue", "b3Wed", "b3Thu", "b4Tue", "b4Wed", "b4Thu"];

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
}[] = [
  { label: "Block 1", time: "9:00 - 10:30 am", slots: ["b1", "b1", "b1"] },
  { label: "Block 2", time: "10:30 am - 12:00 pm", slots: ["b2", "b2", "b2"] },
  { label: "Block 3", time: "12:30 - 2:00 pm", slots: ["b3Tue", "b3Wed", "b3Thu"] },
  { label: "Block 4", time: "2:00 - 3:30 pm", slots: ["b4Tue", "b4Wed", "b4Thu"] },
];

export const SLOT_TO_WEEKDAY: Record<ParentScheduleSlotKey, number[]> = {
  b1: [2, 3, 4],
  b2: [2, 3, 4],
  b3Tue: [2],
  b3Wed: [3],
  b3Thu: [4],
  b4Tue: [2],
  b4Wed: [3],
  b4Thu: [4],
};

export const SLOT_START_TIME: Record<ParentScheduleSlotKey, string> = {
  b1: "9:00 am",
  b2: "10:30 am",
  b3Tue: "12:30 pm",
  b3Wed: "12:30 pm",
  b3Thu: "12:30 pm",
  b4Tue: "2:00 pm",
  b4Wed: "2:00 pm",
  b4Thu: "2:00 pm",
};

export const PARENT_SCHEDULE_SLOT_DISPLAY_ORDER: Record<ParentScheduleSlotKey, number> = {
  b1: 10,
  b2: 20,
  b3Tue: 30,
  b3Wed: 30,
  b3Thu: 30,
  b4Tue: 40,
  b4Wed: 40,
  b4Thu: 40,
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
    time: "12:30 - 2:00 pm",
    overlayTime: "12:30 PM - 2:00 PM",
    scheduleSlot: "b3Tue",
    label: "Block 3 / Day 1",
  },
  block3_day2: {
    title: "Block 3 Day 2",
    block: "B3",
    level: "2",
    time: "12:30 - 2:00 pm",
    overlayTime: "12:30 PM - 2:00 PM",
    scheduleSlot: "b3Wed",
    label: "Block 3 / Day 2",
  },
  block3_day3: {
    title: "Block 3 Day 3",
    block: "B3",
    level: "3",
    time: "12:30 - 2:00 pm",
    overlayTime: "12:30 PM - 2:00 PM",
    scheduleSlot: "b3Thu",
    label: "Block 3 / Day 3",
  },
  block4_day1: {
    title: "Block 4 Day 1",
    block: "B4",
    level: "1",
    time: "2:00 - 3:30 pm",
    overlayTime: "2:00 PM - 3:30 PM",
    scheduleSlot: "b4Tue",
    label: "Block 4 / Day 1",
  },
  block4_day2: {
    title: "Block 4 Day 2",
    block: "B4",
    level: "2",
    time: "2:00 - 3:30 pm",
    overlayTime: "2:00 PM - 3:30 PM",
    scheduleSlot: "b4Wed",
    label: "Block 4 / Day 2",
  },
  block4_day3: {
    title: "Block 4 Day 3",
    block: "B4",
    level: "3",
    time: "2:00 - 3:30 pm",
    overlayTime: "2:00 PM - 3:30 PM",
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

export function scheduleBadgeStatusLabel(
  badge: StudentScheduleBadge,
  context: "calendar" | "grid" | "compact" = "calendar",
): string {
  if (badge.tone === "core") return "School assigned";
  if (badge.tone === "approved") return context === "grid" ? "Enric. Approved" : "Approved";
  if (badge.tone === "pending") {
    if (context === "grid") return "Enric. Pending";
    if (context === "compact") return "Pending";
    return "Pending approval";
  }
  if (badge.tone === "waitlisted") return context === "grid" ? "Enric. Waitlisted" : "Waitlisted";
  if (badge.tone === "draft") return badge.draftKind === "change" ? "Draft change" : "Draft choice";
  if (context === "grid") return "+ Choose class";
  if (context === "compact") return "Available";
  return "Open";
}

export function normalizeScheduleBadges(badges: StudentScheduleBadge[]): StudentScheduleBadge[] {
  const real = badges.filter((badge) => badge.tone !== "empty");
  if (real.length === 0) return [];

  const core = real.filter((badge) => badge.tone === "core");
  if (core.length > 0) {
    return [core[0]];
  }

  const approved = real.filter((badge) => badge.tone === "approved");
  if (approved.length > 0) {
    return [approved[approved.length - 1]];
  }

  return real;
}

export function splitScheduleLabel(schedule: string): { day: string; time: string } {
  const parts = schedule.split("·").map((part) => part.trim()).filter(Boolean);
  return {
    day: parts[0] || schedule || "Schedule not set",
    time: parts[1] || "Time not set",
  };
}

function blockNumberFromText(value: unknown): number | null {
  const text = String(value ?? "").toLowerCase();
  const parsed = Number(text.match(/\bblock\s*([1-4])\b/)?.[1] ?? text.match(/\bb([1-4])\b/)?.[1]);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 4 ? parsed : null;
}

function dayNumberFromText(value: unknown): number | null {
  const text = String(value ?? "").toLowerCase();
  const parsed = Number(text.match(/\bday\s*([1-3])\b/)?.[1] ?? text.match(/^\s*([1-3])\s*$/)?.[1]);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 3 ? parsed : null;
}

export function catalogSlotMetaFromBlockLevel(block: unknown, level: unknown): (typeof CATALOG_SLOT_META)[CatalogSlotId] | null {
  const blockNumber = blockNumberFromText(block);
  const dayNumber = dayNumberFromText(level) ?? dayNumberFromText(block);
  if (!blockNumber || !dayNumber) return null;
  return CATALOG_SLOT_META[`block${blockNumber}_day${dayNumber}` as CatalogSlotId] ?? null;
}

export function formatBlockDayLabel(block: unknown, levelOrDay?: unknown, scheduleSummary?: unknown): string {
  const catalogMeta = catalogSlotMetaFromBlockLevel(block, levelOrDay);
  if (catalogMeta) return catalogMeta.title;

  const source = [block, scheduleSummary].filter(Boolean).join(" ");
  const blockNumber = blockNumberFromText(source);
  const dayNumber = dayNumberFromText(source);
  if (blockNumber && dayNumber) return `Block ${blockNumber} Day ${dayNumber}`;
  if (blockNumber) return `Block ${blockNumber}`;

  return String(block ?? "").trim();
}

export function formatClassLevelLabel(level: unknown): string {
  const text = String(level ?? "").trim();
  if (!text) return "";
  if (/^level\b/i.test(text)) return text.replace(/^level\s*/i, "Level ");
  if (/^\d+$/.test(text)) return `Level ${text}`;
  return text;
}

export function formatRequestOptionLabel(option: unknown): string {
  const text = String(option ?? "").trim();
  const lower = text.toLowerCase();
  if (!text) return "";
  if (lower === "1" || lower === "1st" || lower === "first") return "1st choice";
  if (lower === "2" || lower === "2nd" || lower === "second") return "2nd choice";
  return text;
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
