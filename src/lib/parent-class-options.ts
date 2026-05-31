import type { ProgramTrack, SchoolClassRow, StudentScheduleBadge } from "@/lib/data/types";

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
  program?: ProgramTrack;
  location?: string;
};

export type ParentClassChoiceKind = "firstChoice" | "secondChoice";
export type ParentClassSlotContext =
  | { kind: "change"; label: string }
  | { kind: "empty" };

export type ScheduleDisplayParts = { day: string; time: string };

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
    program: row.program,
    location: row.location,
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

export function availabilityLabelForOption(option: ParentClassOption): string {
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

export function scheduleParts(option: ParentClassOption): ScheduleDisplayParts {
  const parts = (option.schedule ?? "").split("·").map((part) => part.trim()).filter(Boolean);
  return {
    day: parts[0] || option.block || "Schedule not set",
    time: parts[2] || parts[1] || "Time not set",
  };
}

export function classNameFromScheduleBadge(label: string): string {
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
