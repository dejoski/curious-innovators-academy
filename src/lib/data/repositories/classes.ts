import type { ResolvedList } from "@/lib/data/fetch-source";
import type {
  ClassRosterStatus,
  ClassRosterStudent,
  ProgramTrack,
  SchoolClassRow,
} from "@/lib/data/types";
import { fallbackList, isSupabaseConfigured } from "@/lib/data/env";
import { CLASSES_FALLBACK } from "@/lib/data/mock/classes";
import { STUDENTS_FALLBACK } from "@/lib/data/mock/students";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatStudentsLabel(row: Record<string, unknown>): string {
  const direct = row.students_label ?? row.students;
  if (typeof direct === "string" && direct.includes("/")) return direct;

  const enrolled = Number(row.enrolled_count ?? row.enrolled ?? NaN);
  const capacity = Number(row.capacity ?? row.max_students ?? NaN);
  if (Number.isFinite(enrolled) && Number.isFinite(capacity)) {
    return `${Math.max(0, Math.floor(enrolled))}/${Math.max(0, Math.floor(capacity))}`;
  }

  return "0/1";
}

function splitEnrollmentCounts(enrollments: unknown): { approved: number; pending: number } {
  if (!Array.isArray(enrollments)) return { approved: 0, pending: 0 };
  let approved = 0;
  let pending = 0;
  for (const raw of enrollments) {
    if (raw && typeof raw === "object" && "status" in raw) {
      const st = String((raw as { status: unknown }).status).toLowerCase();
      if (st === "pending") pending++;
      else if (st === "approved") approved++;
    } else {
      approved++;
    }
  }
  return { approved, pending };
}

function normalizeProgram(raw: unknown): ProgramTrack {
  const s = String(raw ?? "core").toLowerCase();
  return s === "enrichment" ? "enrichment" : "core";
}

function normalizeRosterStatus(raw: unknown): ClassRosterStatus {
  const s = String(raw ?? "").toLowerCase();
  if (s === "approved") return "Approved";
  if (s === "rejected") return "Rejected";
  return "Pending";
}

export function mapClassRow(row: Record<string, unknown>): SchoolClassRow | null {
  if (row.id == null || String(row.id) === "") return null;

  const id = String(row.id);
  const rawStatus = String(row.status ?? "Active");
  const status: SchoolClassRow["status"] =
    rawStatus.toLowerCase() === "full" ? "Full" : "Active";

  const pendingRaw = row.pending_count ?? row.pending_enrollments;
  const pendingCount =
    typeof pendingRaw === "number" && Number.isFinite(pendingRaw)
      ? Math.max(0, Math.floor(pendingRaw))
      : Number.isFinite(Number(pendingRaw))
        ? Math.max(0, Math.floor(Number(pendingRaw)))
        : 0;

  const waitRaw = row.waitlist_count ?? row.waitlist;
  const waitlistCount =
    typeof waitRaw === "number" && Number.isFinite(waitRaw)
      ? Math.max(0, Math.floor(waitRaw))
      : Number.isFinite(Number(waitRaw))
        ? Math.max(0, Math.floor(Number(waitRaw)))
        : 0;

  return {
    id,
    name: String(row.name ?? row.title ?? ""),
    teacher: String(row.teacher_name ?? row.teacher ?? ""),
    students: formatStudentsLabel(row),
    schedule: String(row.schedule ?? row.schedule_label ?? row.schedule_summary ?? ""),
    status,
    program: normalizeProgram(row.program ?? row.track),
    level: String(row.level ?? row.level_label ?? "").trim(),
    block: String(row.block ?? row.block_label ?? "").trim(),
    location: String(row.location ?? "").trim(),
    description: String(row.description ?? "").trim(),
    prerequisites: String(row.prerequisites ?? "").trim(),
    pendingCount,
    waitlistCount,
  };
}

function flattenClassJoinRow(row: Record<string, unknown>): Record<string, unknown> {
  const teachers = row.teachers as Record<string, unknown> | Record<string, unknown>[] | null;
  const t = Array.isArray(teachers) ? teachers[0] : teachers;
  let teacherName = "";
  if (t && typeof t === "object") {
    const profs = (t as { profiles?: unknown }).profiles;
    const prof = Array.isArray(profs) ? profs[0] : profs;
    if (prof && typeof prof === "object" && prof !== null && "display_name" in prof) {
      teacherName = String((prof as { display_name: unknown }).display_name);
    }
  }

  const enrollments = row.enrollments as unknown[] | null;
  const { approved, pending } = splitEnrollmentCounts(enrollments);

  return {
    ...row,
    teacher_name: teacherName,
    enrolled_count: approved,
    pending_count: pending,
    level: row.level,
    block: row.block,
    location: row.location,
    description: row.description,
    prerequisites: row.prerequisites,
    schedule_summary: row.schedule_summary,
  };
}

async function loadClassesResolved(): Promise<ResolvedList<SchoolClassRow>> {
  if (!isSupabaseConfigured()) {
    return fallbackList(CLASSES_FALLBACK);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("classes")
      .select(
        `
        id,
        name,
        program,
        capacity,
        schedule_summary,
        level,
        block,
        location,
        description,
        prerequisites,
        status,
        teachers (
          profiles (
            display_name
          )
        ),
        enrollments ( id, status )
      `,
      )
      .order("created_at", { ascending: true });

    if (error) {
      return fallbackList(CLASSES_FALLBACK);
    }

    if (!data?.length) {
      return { items: [], source: "remote" };
    }

    const mapped = data
      .map((row) =>
        mapClassRow(flattenClassJoinRow(row as unknown as Record<string, unknown>)),
      )
      .filter((x): x is SchoolClassRow => x !== null);

    if (mapped.length === 0) {
      return fallbackList(CLASSES_FALLBACK);
    }
    return { items: mapped, source: "remote" };
  } catch {
    return fallbackList(CLASSES_FALLBACK);
  }
}

/** Loads classes for /dashboard/classes; falls back to demo seed when offline or on error. */
export async function fetchClasses(): Promise<SchoolClassRow[]> {
  const { items } = await loadClassesResolved();
  return items;
}

export async function fetchClassesResolved(): Promise<ResolvedList<SchoolClassRow>> {
  return loadClassesResolved();
}

function fallbackRoster(): ResolvedList<ClassRosterStudent> {
  return fallbackList(
    STUDENTS_FALLBACK.slice(0, 6).map((student) => ({
      id: student.id,
      name: student.name,
      parent: student.parent,
      age: Number.parseInt(student.level, 10) || 13,
      level: student.level,
      status: student.status === "Completed" ? "Approved" : "Pending",
      description: student.notes,
    })),
  );
}

function firstRel<T extends Record<string, unknown>>(v: unknown): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return v as T;
}

function mapRosterEnrollmentRow(row: Record<string, unknown>): ClassRosterStudent | null {
  const student = firstRel<Record<string, unknown>>(row.students);
  const id = student?.id ?? row.student_id ?? row.id;
  if (id == null || String(id) === "") return null;
  return {
    id: String(id),
    name: String(student?.display_name ?? row.student_name ?? ""),
    parent: String(student?.guardian_label ?? row.parent_name ?? ""),
    age: Number(student?.age_years ?? row.age_years ?? 0) || 0,
    level: String(student?.level ?? row.level ?? ""),
    status: normalizeRosterStatus(row.status),
    description: String(
      student?.support_notes ??
        student?.learning_profile ??
        row.description ??
        row.notes ??
        "",
    ),
  };
}

export async function fetchClassRosterResolved(
  classId: string,
): Promise<ResolvedList<ClassRosterStudent>> {
  const id = classId.trim();
  if (!id) return { items: [], source: "unavailable" };

  if (!isSupabaseConfigured()) {
    return fallbackRoster();
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("enrollments")
      .select(
        `
        id,
        status,
        student_id,
        students (
          id,
          display_name,
          guardian_label,
          age_years,
          level,
          learning_profile,
          support_notes
        )
      `,
      )
      .eq("class_id", id)
      .order("created_at", { ascending: true });

    if (error) return fallbackRoster();
    if (!data?.length) return { items: [], source: "remote" };

    const mapped = data
      .map((row) => mapRosterEnrollmentRow(row as unknown as Record<string, unknown>))
      .filter((x): x is ClassRosterStudent => x !== null);
    if (mapped.length === 0) return fallbackRoster();
    return { items: mapped, source: "remote" };
  } catch {
    return fallbackRoster();
  }
}
