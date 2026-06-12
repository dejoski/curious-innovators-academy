import type { ScheduleConflict, StudentScheduleBadge, StudentScheduleRow } from "@/lib/data/types";
import type { ParentScheduleSlotKey } from "@/lib/schedule-slots";

export const DAILY_SCHEDULE_KEYS = [
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
] as const satisfies readonly ParentScheduleSlotKey[];

type DailyScheduleSlotKey = (typeof DAILY_SCHEDULE_KEYS)[number];

type TeacherPlacement = {
  row: StudentScheduleRow;
  slot: DailyScheduleSlotKey;
  badge: StudentScheduleBadge;
  classId: string;
  teacherId: string;
};

const CONFIRMED_TONES = new Set<StudentScheduleBadge["tone"]>(["approved", "core"]);

const SLOT_DAY_LABEL: Record<DailyScheduleSlotKey, string> = {
  b1Tue: "Block 1 Day 1",
  b2Tue: "Block 2 Day 1",
  b3Tue: "Block 3 Day 1",
  b4Tue: "Block 4 Day 1",
  b1Wed: "Block 1 Day 2",
  b2Wed: "Block 2 Day 2",
  b3Wed: "Block 3 Day 2",
  b4Wed: "Block 4 Day 2",
  b1Thu: "Block 1 Day 3",
  b2Thu: "Block 2 Day 3",
  b3Thu: "Block 3 Day 3",
  b4Thu: "Block 4 Day 3",
};

function isConfirmedClassPlacement(badge: StudentScheduleBadge): boolean {
  return CONFIRMED_TONES.has(badge.tone) && Boolean(badge.classId?.trim()) && Boolean(badge.teacherId?.trim());
}

function teacherConflictRecord(placement: TeacherPlacement): ScheduleConflict {
  const teacher = placement.badge.teacher?.trim() || "This teacher";
  return {
    kind: "teacher",
    label: "Teacher conflict",
    detail: `${teacher} has multiple confirmed class placements in ${SLOT_DAY_LABEL[placement.slot]}.`,
    classId: placement.classId,
    className: placement.badge.label,
    teacherId: placement.teacherId,
    teacher: placement.badge.teacher,
  };
}

function hasTeacherConflictRecord(row: StudentScheduleRow, placement: TeacherPlacement): boolean {
  return (row.conflicts ?? []).some((conflict) =>
    conflict.kind === "teacher" &&
    conflict.teacherId === placement.teacherId &&
    conflict.classId === placement.classId &&
    conflict.detail === teacherConflictRecord(placement).detail,
  );
}

export function applyTeacherConflictDiagnostics(rows: StudentScheduleRow[]) {
  const placementsBySlotTeacher = new Map<string, TeacherPlacement[]>();

  for (const row of rows) {
    for (const slot of DAILY_SCHEDULE_KEYS) {
      for (const badge of row[slot] ?? []) {
        if (!isConfirmedClassPlacement(badge)) continue;
        const classId = badge.classId?.trim() ?? "";
        const teacherId = badge.teacherId?.trim() ?? "";
        const key = `${slot}\u0000${teacherId}`;
        const placements = placementsBySlotTeacher.get(key) ?? [];
        placements.push({ row, slot, badge, classId, teacherId });
        placementsBySlotTeacher.set(key, placements);
      }
    }
  }

  for (const placements of placementsBySlotTeacher.values()) {
    const distinctClassIds = new Set(placements.map((placement) => placement.classId));
    if (distinctClassIds.size < 2) continue;

    for (const placement of placements) {
      if (hasTeacherConflictRecord(placement.row, placement)) continue;
      placement.row.hasConflicts = true;
      placement.row.conflicts = placement.row.conflicts ?? [];
      placement.row.conflicts.push(teacherConflictRecord(placement));
    }
  }
}
