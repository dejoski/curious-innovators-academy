import type { CalendarEventType, StudentScheduleBadge, StudentScheduleRow } from "@/lib/data/types";

export type ParentScheduleSlotKey =
  | "b1"
  | "b1Tue"
  | "b1Wed"
  | "b1Thu"
  | "b2"
  | "b2Tue"
  | "b2Wed"
  | "b2Thu"
  | "b3Tue"
  | "b3Wed"
  | "b3Thu"
  | "b4Tue"
  | "b4Wed"
  | "b4Thu";

export type DailyParentScheduleSlotKey = Exclude<ParentScheduleSlotKey, "b1" | "b2">;

export type ParentScheduleBadges = Partial<Record<ParentScheduleSlotKey, StudentScheduleBadge[]>>;

export const PARENT_SCHEDULE_SLOT_KEYS: ParentScheduleSlotKey[] = [
  "b1Tue",
  "b1Wed",
  "b1Thu",
  "b2Tue",
  "b2Wed",
  "b2Thu",
  "b3Tue",
  "b3Wed",
  "b3Thu",
  "b4Tue",
  "b4Wed",
  "b4Thu",
];

export const STUDENT_SCHEDULE_COMPARISON_SLOT_KEYS: DailyParentScheduleSlotKey[] = [
  "b1Tue",
  "b2Tue",
  "b3Tue",
  "b4Tue",
  "b1Wed",
  "b2Wed",
  "b3Wed",
  "b4Wed",
  "b1Thu",
  "b2Thu",
  "b3Thu",
  "b4Thu",
];

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
  { label: "Block 1", time: "9:00 - 10:30 am", slots: ["b1Tue", "b1Wed", "b1Thu"] },
  { label: "Block 2", time: "10:30 am - 12:00 pm", slots: ["b2Tue", "b2Wed", "b2Thu"] },
  { label: "Block 3", time: "12:30 - 2:00 pm", slots: ["b3Tue", "b3Wed", "b3Thu"] },
  { label: "Block 4", time: "2:00 - 3:30 pm", slots: ["b4Tue", "b4Wed", "b4Thu"] },
];

export type ScheduleDisplayParts = { day: string; time: string };

const SCHEDULE_SEPARATOR_RE = /\s*(?:\u00c2?\u00b7|\||,)\s*/;
const TIME_RANGE_RE = /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*-\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i;

function schedulePartsFromText(value: unknown): string[] {
  return String(value ?? "").split(SCHEDULE_SEPARATOR_RE).map((part) => part.trim()).filter(Boolean);
}

function scheduleTimeForBlock(block: unknown): string | null {
  const blockNumber = blockNumberFromText(block);
  if (!blockNumber) return null;
  return PARENT_SCHEDULE_ROWS[blockNumber - 1]?.time ?? null;
}

export function scheduleStartLabelForBlock(block: unknown): string | null {
  return scheduleTimePartsForBlock(block)?.start ?? null;
}

export function scheduleTimePartsForBlock(block: unknown): { start: string; end: string } | null {
  const time = scheduleTimeForBlock(block);
  if (!time) return null;
  const [rawStart, rawEnd] = time.split(/\s+-\s+/);
  const start = rawStart?.trim();
  const end = rawEnd?.trim();
  if (!start || !end) return null;
  const endMeridiem = end.match(/\b(am|pm)\b/i)?.[1]?.toLowerCase();
  const startWithMeridiem = /\b(am|pm)\b/i.test(start) || !endMeridiem ? start : `${start} ${endMeridiem}`;
  return { start: startWithMeridiem, end };
}

export function canonicalScheduleSummaryForBlockDay(block: unknown, day: unknown): string {
  const blockNumber = blockNumberFromText(block);
  const dayNumber = dayNumberFromText(day) ?? dayNumberFromText(block);
  const blockLabel = blockNumber ? `Block ${blockNumber}` : String(block ?? "").trim();
  const dayLabel = dayNumber ? `Day ${dayNumber}` : String(day ?? "").trim();
  const time = scheduleTimeForBlock(block);
  return [dayLabel, blockLabel, time].filter(Boolean).join(" \u00b7 ");
}

export function classSchedulePartsFromFields(input: {
  block?: unknown;
  level?: unknown;
  scheduleSummary?: unknown;
}): ScheduleDisplayParts {
  const source = [input.scheduleSummary, input.block, input.level].filter(Boolean).join(" ");
  const scheduleParts = schedulePartsFromText(input.scheduleSummary);
  const blockNumber = blockNumberFromText(source);
  const dayNumber =
    dayNumberFromText(input.scheduleSummary) ??
    dayNumberFromText(input.block) ??
    (blockNumber && blockNumber >= 3 ? dayNumberFromText(input.level) : null);
  const fallbackDay =
    scheduleParts.find((part) => !blockNumberFromText(part) && !TIME_RANGE_RE.test(part)) ||
    String(input.block ?? "").trim() ||
    "Schedule not set";
  const day =
    dayNumber != null
      ? `Day ${dayNumber}`
      : fallbackDay;
  const time =
    scheduleTimeForBlock(source) ??
    scheduleParts.find((part) => TIME_RANGE_RE.test(part)) ??
    String(input.scheduleSummary ?? "").match(TIME_RANGE_RE)?.[0] ??
    "Time not set";

  return { day, time };
}

export function formatClassScheduleLabel(input: {
  block?: unknown;
  level?: unknown;
  scheduleSummary?: unknown;
}): string {
  const source = [input.scheduleSummary, input.block, input.level].filter(Boolean).join(" ");
  const blockNumber = blockNumberFromText(source);
  const blockLabel = blockNumber ? `Block ${blockNumber}` : String(input.block ?? "").trim();
  const { day, time } = classSchedulePartsFromFields(input);
  return [day, blockLabel, time].filter(Boolean).join(" \u00b7 ");
}

export const SLOT_TO_WEEKDAY: Record<ParentScheduleSlotKey, number[]> = {
  b1: [2, 3, 4],
  b1Tue: [2],
  b1Wed: [3],
  b1Thu: [4],
  b2: [2, 3, 4],
  b2Tue: [2],
  b2Wed: [3],
  b2Thu: [4],
  b3Tue: [2],
  b3Wed: [3],
  b3Thu: [4],
  b4Tue: [2],
  b4Wed: [3],
  b4Thu: [4],
};

export const SLOT_START_TIME: Record<ParentScheduleSlotKey, string> = {
  b1: "9:00 am",
  b1Tue: "9:00 am",
  b1Wed: "9:00 am",
  b1Thu: "9:00 am",
  b2: "10:30 am",
  b2Tue: "10:30 am",
  b2Wed: "10:30 am",
  b2Thu: "10:30 am",
  b3Tue: "12:30 pm",
  b3Wed: "12:30 pm",
  b3Thu: "12:30 pm",
  b4Tue: "2:00 pm",
  b4Wed: "2:00 pm",
  b4Thu: "2:00 pm",
};

export const PARENT_SCHEDULE_SLOT_DISPLAY_ORDER: Record<ParentScheduleSlotKey, number> = {
  b1: 10,
  b1Tue: 10,
  b1Wed: 10,
  b1Thu: 10,
  b2: 20,
  b2Tue: 20,
  b2Wed: 20,
  b2Thu: 20,
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

const EMPTY_SCHEDULE_BADGE: StudentScheduleBadge = { label: "--", tone: "empty" };

export function emptyScheduleBadgesBySlot(): Record<ParentScheduleSlotKey, StudentScheduleBadge[]> {
  return {
    b1: [{ ...EMPTY_SCHEDULE_BADGE }],
    b1Tue: [{ ...EMPTY_SCHEDULE_BADGE }],
    b1Wed: [{ ...EMPTY_SCHEDULE_BADGE }],
    b1Thu: [{ ...EMPTY_SCHEDULE_BADGE }],
    b2: [{ ...EMPTY_SCHEDULE_BADGE }],
    b2Tue: [{ ...EMPTY_SCHEDULE_BADGE }],
    b2Wed: [{ ...EMPTY_SCHEDULE_BADGE }],
    b2Thu: [{ ...EMPTY_SCHEDULE_BADGE }],
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
    return core;
  }

  const approved = real.filter((badge) => badge.tone === "approved");
  if (approved.length > 0) {
    return [approved[approved.length - 1]];
  }

  return real;
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

function dayNumberFromText(value: unknown): number | null {
  const text = String(value ?? "").toLowerCase();
  const parsed = Number(text.match(/\bday\s*([1-3])\b/)?.[1] ?? text.match(/^\s*([1-3])\s*$/)?.[1]);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 3 ? parsed : null;
}

function blockNumberFromText(value: unknown): number | null {
  const text = String(value ?? "").toLowerCase();
  const parsed = Number(
    text.match(/\bblock\s*([1-4])\b/)?.[1] ??
      text.match(/\bb([1-4])\b/)?.[1] ??
      text.match(/^\s*([1-4])\s*$/)?.[1],
  );
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 4 ? parsed : null;
}

function catalogSlotMetaFromBlockLevel(block: unknown, levelOrDay: unknown) {
  const blockNumber = blockNumberFromText(block);
  const dayNumber = dayNumberFromText(levelOrDay) ?? dayNumberFromText(block);
  if (!blockNumber || !dayNumber) return null;
  const blockKey = `block${blockNumber}` as "block3" | "block4";
  const dayKey = `day${dayNumber}` as "day1" | "day2" | "day3";
  const slotId = `${blockKey}_${dayKey}`;
  return CATALOG_SLOT_META[slotId] ?? null;
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

  if (blockNumber === 1) return daySlot ? (`b1${daySlot}` as ParentScheduleSlotKey) : "b1";
  if (blockNumber === 2) return daySlot ? (`b2${daySlot}` as ParentScheduleSlotKey) : "b2";
  if (blockNumber === 4) return daySlot ? (`b4${daySlot}` as ParentScheduleSlotKey) : index % 3 === 0 ? "b4Tue" : index % 3 === 1 ? "b4Wed" : "b4Thu";
  if (blockNumber === 3) return daySlot ? (`b3${daySlot}` as ParentScheduleSlotKey) : index % 3 === 0 ? "b3Tue" : index % 3 === 1 ? "b3Wed" : "b3Thu";
  return index % 3 === 0 ? "b3Tue" : index % 3 === 1 ? "b3Wed" : "b3Thu";
}

export function studentScheduleSlots(row: StudentScheduleRow): Record<ParentScheduleSlotKey, StudentScheduleBadge[]> {
  return {
    b1: row.b1,
    b1Tue: row.b1Tue,
    b1Wed: row.b1Wed,
    b1Thu: row.b1Thu,
    b2: row.b2,
    b2Tue: row.b2Tue,
    b2Wed: row.b2Wed,
    b2Thu: row.b2Thu,
    b3Tue: row.b3Tue,
    b3Wed: row.b3Wed,
    b3Thu: row.b3Thu,
    b4Tue: row.b4Tue,
    b4Wed: row.b4Wed,
    b4Thu: row.b4Thu,
  };
}
