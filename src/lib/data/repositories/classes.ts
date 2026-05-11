import type { ResolvedList } from "@/lib/data/fetch-source";
import type { ProgramTrack, SchoolClassRow } from "@/lib/data/types";
import { isSupabaseConfigured } from "@/lib/data/env";
import { CLASSES_FALLBACK } from "@/lib/data/mock/classes";
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
    schedule_summary: row.schedule_summary,
  };
}

async function loadClassesResolved(): Promise<ResolvedList<SchoolClassRow>> {
  if (!isSupabaseConfigured()) {
    return { items: [...CLASSES_FALLBACK], source: "fallback" };
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
      return { items: [...CLASSES_FALLBACK], source: "fallback" };
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
      return { items: [...CLASSES_FALLBACK], source: "fallback" };
    }
    return { items: mapped, source: "remote" };
  } catch {
    return { items: [...CLASSES_FALLBACK], source: "fallback" };
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
