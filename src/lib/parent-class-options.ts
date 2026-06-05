import type { ProgramTrack, SchoolClassRow, StudentScheduleBadge, StudentScheduleRow } from "@/lib/data/types";
import {
  classSchedulePartsFromFields,
  scheduleSlotForClassFields,
  type ParentScheduleSlotKey,
  type ScheduleDisplayParts,
} from "@/lib/schedule-slots";

export type ParentClassOption = {
  id: string;
  name: string;
  teacher: string;
  description: string;
  prerequisites: string;
  block: string;
  level: string;
  seats: string;
  capacity?: number;
  enrolledCount?: number;
  reservedCount?: number;
  pendingCount?: number;
  seatsRemaining?: number;
  availabilityLabel?: string;
  schedule?: string;
  status?: SchoolClassRow["status"];
  isActive?: boolean;
  archivedAt?: string;
  program?: ProgramTrack;
  location?: string;
  minAgeYears?: number;
  maxAgeYears?: number;
  waitlistCount?: number;
};

export type ParentClassChoiceKind = "firstChoice" | "secondChoice";
export type ParentClassSlotContext =
  | { kind: "change"; label: string }
  | { kind: "empty" };

export type { ScheduleDisplayParts };

export function parentClassOptionFromRow(row: SchoolClassRow): ParentClassOption {
  const fallbackDescription =
    row.program === "core"
      ? `${row.name} is a school-assigned core academic class in the student's schedule.`
      : `${row.name} gives students a structured enrichment option with placement managed by the school team.`;

  return {
    id: row.id,
    name: row.name,
    teacher: row.teacher || "Teacher not assigned",
    description: row.description || fallbackDescription,
    prerequisites: row.prerequisites || "None listed",
    block: row.block,
    level: row.level,
    seats: row.students,
    capacity: row.capacity,
    enrolledCount: row.enrolledCount,
    reservedCount: row.reservedCount,
    pendingCount: row.pendingCount,
    seatsRemaining: row.seatsRemaining,
    availabilityLabel: row.availabilityLabel,
    schedule: row.schedule,
    status: row.status,
    isActive: row.isActive,
    archivedAt: row.archivedAt,
    program: row.program,
    location: row.location,
    minAgeYears: row.minAgeYears,
    maxAgeYears: row.maxAgeYears,
    waitlistCount: row.waitlistCount,
  };
}

export function fallbackParentClassOption(name: string, id = ""): ParentClassOption {
  return {
    id,
    name,
    teacher: "Teacher not assigned",
    description: "Class details are not available from the class catalog yet.",
    prerequisites: "None listed",
    block: "Schedule not set",
    level: "Level not set",
    seats: "Seats not set",
    availabilityLabel: "Availability not available",
  };
}

export function seatsRemainingForOption(option: ParentClassOption): number | null {
  if (typeof option.seatsRemaining === "number" && Number.isFinite(option.seatsRemaining)) {
    return Math.max(0, Math.floor(option.seatsRemaining));
  }
  if (typeof option.capacity !== "number" || !Number.isFinite(option.capacity)) return null;
  const reserved =
    typeof option.reservedCount === "number" && Number.isFinite(option.reservedCount)
      ? option.reservedCount
      : (option.enrolledCount ?? 0) + (option.pendingCount ?? 0);
  return Math.max(0, Math.floor(option.capacity) - Math.max(0, Math.floor(reserved)));
}

function availabilityLabelForOption(option: ParentClassOption): string {
  if (option.availabilityLabel) return option.availabilityLabel;
  const remaining = seatsRemainingForOption(option);
  if (remaining == null) return "Availability not available";
  if (remaining <= 0) return "Full";
  return remaining === 1 ? "1 seat left" : `${remaining} seats left`;
}

export function isOptionFull(option: ParentClassOption): boolean {
  const remaining = seatsRemainingForOption(option);
  return option.status === "Full" || remaining === 0;
}

export function selectionLabelForOption(option: ParentClassOption): string {
  return isOptionFull(option) ? "Waitlist available" : availabilityLabelForOption(option);
}

export function scheduleParts(option: ParentClassOption): ScheduleDisplayParts {
  return classSchedulePartsFromFields({
    block: option.block,
    level: option.level,
    scheduleSummary: option.schedule,
  });
}

function scheduleSlotForParentClassOption(option: ParentClassOption): ParentScheduleSlotKey {
  return scheduleSlotForClassFields({
    block: option.block,
    scheduleSummary: option.schedule,
  });
}

export function parseStudentAgeYears(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "—") return null;
  const n = Number(raw.match(/\d+(?:\.\d+)?/)?.[0] ?? NaN);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.floor(n);
  return rounded >= 0 && rounded <= 30 ? rounded : null;
}

function isOptionAgeEligible(option: ParentClassOption, studentAgeYears: number | null): boolean {
  if (studentAgeYears == null) return true;
  if (typeof option.minAgeYears === "number" && studentAgeYears < option.minAgeYears) return false;
  if (typeof option.maxAgeYears === "number" && studentAgeYears > option.maxAgeYears) return false;
  return true;
}

export function hasBlockingScheduleConflict(
  option: ParentClassOption,
  schedule?: StudentScheduleRow | null,
): boolean {
  if (!schedule) return false;
  const slot = scheduleSlotForParentClassOption(option);
  const badges = schedule[slot] ?? [];
  return badges.some((badge) => badge.tone === "core" || badge.tone === "approved" || badge.tone === "pending");
}

export function isParentSelectableEnrichmentOption(
  option: ParentClassOption,
  input: { studentAgeYears?: number | null; schedule?: StudentScheduleRow | null } = {},
): boolean {
  if (option.program !== "enrichment") return false;
  if (option.isActive === false) return false;
  if (option.archivedAt) return false;
  if (isOptionFull(option)) return false;
  if (!isOptionAgeEligible(option, input.studentAgeYears ?? null)) return false;
  if (hasBlockingScheduleConflict(option, input.schedule)) return false;
  return true;
}

function classNameFromScheduleBadge(label: string): string {
  return label
    .replace(/^Draft change:\s*/i, "")
    .replace(/^Draft choice:\s*/i, "")
    .replace(/^Rejected 2nd:\s*/i, "")
    .replace(/^Rejected:\s*/i, "")
    .replace(/^2nd:\s*/i, "")
    .trim();
}

export function classOptionForScheduleBadge(
  badge: StudentScheduleBadge,
  options: ParentClassOption[],
): ParentClassOption {
  const label = classNameFromScheduleBadge(badge.label);
  const normalizedLabel = label.toLowerCase();
  return (
    options.find((option) => option.name.toLowerCase() === normalizedLabel) ??
    fallbackParentClassOption(label)
  );
}

export function parentClassOptionsForCatalogSlot(
  options: ParentClassOption[],
  slot: { block: string; level: string },
): ParentClassOption[] {
  const blockNumber = slot.block.match(/\d+/)?.[0] ?? "";
  const dayNumber = slot.level.match(/\d+/)?.[0] ?? "";
  const textFor = (option: ParentClassOption) => `${option.block} ${option.level} ${option.schedule ?? ""}`.toLowerCase();
  const matchesBlock = (option: ParentClassOption) => {
    const text = textFor(option);
    return text.includes(`block ${blockNumber}`) || text.includes(`b${blockNumber}`);
  };
  const matchesDay = (option: ParentClassOption) => {
    const text = textFor(option);
    return text.includes(`day ${dayNumber}`);
  };
  const exact = options.filter((option) => matchesBlock(option) && matchesDay(option));
  const seen = new Set<string>();
  return exact.filter((option) => {
    const key = option.id || option.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
