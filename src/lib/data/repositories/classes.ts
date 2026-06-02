import "server-only";

import type { ResolvedList } from "@/lib/data/fetch-source";
import type {
  ClassRosterStatus,
  ClassRosterStudent,
  ProgramTrack,
  SchoolClassOptionRow,
  SchoolClassRow,
} from "@/lib/data/types";
import { requireAdminReadClient, type AdminReadClient } from "@/lib/api/admin-read";
import { isSupabaseConfigured, unavailableList } from "@/lib/data/env";
import { parentContactFromStudentRow, STUDENT_PARENT_CONTACT_SELECT } from "@/lib/data/parent-contact";
import { firstRel } from "@/lib/data/repositories/relations";
import { fetchCurrentSemesterResolved } from "@/lib/data/repositories/semesters";
import { formatClassScheduleLabel } from "@/lib/schedule-slots";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ClassReadClient = Awaited<ReturnType<typeof createSupabaseServerClient>> | AdminReadClient;
type ClassQueryOptions = { semesterId?: string | null };

function formatStudentsLabel(row: Record<string, unknown>): string {
  const direct = row.students_label ?? row.students;
  if (typeof direct === "string" && direct.includes("/")) return direct;

  const enrolled = Number(row.reserved_count ?? row.enrolled_count ?? row.enrolled ?? NaN);
  const capacity = Number(row.capacity ?? row.max_students ?? NaN);
  if (Number.isFinite(enrolled) && Number.isFinite(capacity)) {
    return `${Math.max(0, Math.floor(enrolled))}/${Math.max(0, Math.floor(capacity))}`;
  }

  return "0/1";
}

function numberField(row: Record<string, unknown>, key: string): number | null {
  const raw = row[key];
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
}

function formatAvailabilityLabel(seatsRemaining: number, capacity: number): string {
  if (capacity <= 0 || seatsRemaining <= 0) return "Full";
  if (seatsRemaining === 1) return "1 seat left";
  return `${seatsRemaining} seats left`;
}

const CLASS_SELECT_BASE = `
  *,
  teachers (
    profiles (
      display_name
    )
  )
`;

const CLASS_SELECT = `
  *,
  semesters (
    id,
    name,
    starts_on,
    ends_on,
    is_current
  ),
  teachers (
    profiles (
      display_name
    )
  )
`;

function normalizeProgram(raw: unknown): ProgramTrack {
  const s = String(raw ?? "core").toLowerCase();
  return s === "enrichment" ? "enrichment" : "core";
}

function normalizeRosterStatus(raw: unknown): ClassRosterStatus {
  const s = String(raw ?? "").toLowerCase();
  if (s === "approved") return "Approved";
  if (s === "waitlisted" || s === "waitlist") return "Waitlisted";
  if (s === "rejected") return "Rejected";
  return "Pending";
}

export function mapClassRow(row: Record<string, unknown>): SchoolClassRow | null {
  if (row.id == null || String(row.id) === "") return null;

  const id = String(row.id);
  const semester = firstRel<Record<string, unknown>>(row.semesters);
  const capacity = numberField(row, "capacity") ?? numberField(row, "max_students") ?? 1;
  const reservedCount = numberField(row, "reserved_count") ?? numberField(row, "reserved") ?? 0;
  const enrolledCount = numberField(row, "enrolled_count") ?? numberField(row, "enrolled") ?? 0;
  const seatsRemaining = numberField(row, "seats_remaining") ?? Math.max(0, capacity - reservedCount);
  const rawStatus = String(row.status ?? "Active");
  const status: SchoolClassRow["status"] =
    rawStatus.toLowerCase() === "full" || seatsRemaining <= 0 ? "Full" : "Active";

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

  const block = String(row.block ?? row.block_label ?? "").trim();
  const level = String(row.level ?? row.level_label ?? "").trim();
  const scheduleSummary = row.schedule ?? row.schedule_label ?? row.schedule_summary ?? "";

  return {
    id,
    semesterId: String(semester?.id ?? row.semester_id ?? ""),
    semesterName: String(semester?.name ?? row.semester_name ?? ""),
    semesterStartsOn: String(semester?.starts_on ?? row.semester_starts_on ?? "").slice(0, 10),
    semesterEndsOn: String(semester?.ends_on ?? row.semester_ends_on ?? "").slice(0, 10),
    name: String(row.name ?? row.title ?? ""),
    teacher: String(row.teacher_name ?? row.teacher ?? ""),
    students: formatStudentsLabel(row),
    schedule: formatClassScheduleLabel({ block, level, scheduleSummary }),
    status,
    program: normalizeProgram(row.program ?? row.track),
    level,
    block,
    location: String(row.location ?? "").trim(),
    description: String(row.description ?? "").trim(),
    prerequisites: String(row.prerequisites ?? "").trim(),
    pendingCount,
    waitlistCount,
    capacity,
    enrolledCount,
    reservedCount,
    seatsRemaining,
    availabilityLabel: String(row.availability_label ?? "").trim() || formatAvailabilityLabel(seatsRemaining, capacity),
  };
}

function flattenClassBaseRow(row: Record<string, unknown>): Record<string, unknown> {
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

  return {
    ...row,
    teacher_name: teacherName,
  };
}

function availabilityFields(row: Record<string, unknown> | undefined): Record<string, unknown> {
  return {
    enrolled_count: row ? (numberField(row, "enrolled_count") ?? 0) : 0,
    pending_count: row ? (numberField(row, "pending_count") ?? 0) : 0,
    waitlist_count: row ? (numberField(row, "waitlist_count") ?? 0) : 0,
    reserved_count: row ? (numberField(row, "reserved_count") ?? 0) : 0,
    seats_remaining: row ? (numberField(row, "seats_remaining") ?? undefined) : undefined,
    availability_label: row?.availability_label,
  };
}

function availabilityByClassId(rows: Record<string, unknown>[] | null | undefined): Map<string, Record<string, unknown>> {
  const byClassId = new Map<string, Record<string, unknown>>();
  for (const row of rows ?? []) {
    const classId = row.class_id;
    if (classId == null || String(classId) === "") continue;
    byClassId.set(String(classId), row);
  }
  return byClassId;
}

function classQueryNeedsSchemaFallback(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const row = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  const text = [row.code, row.message, row.details, row.hint].map((value) => String(value ?? "").toLowerCase()).join(" ");
  return (
    text.includes("semester") ||
    text.includes("schema cache") ||
    text.includes("relationship") ||
    text.includes("column") ||
    text.includes("42703") ||
    text.includes("pgrst200") ||
    text.includes("pgrst205")
  );
}

async function resolveSemesterFilter(client: ClassReadClient, options?: ClassQueryOptions): Promise<string | null> {
  const explicit = options?.semesterId?.trim();
  if (explicit) return explicit;
  const { semester } = await fetchCurrentSemesterResolved(client);
  return semester?.id ?? null;
}

async function loadClassesResolved(client?: ClassReadClient, options?: ClassQueryOptions): Promise<ResolvedList<SchoolClassRow>> {
  if (!isSupabaseConfigured()) {
    return unavailableList();
  }

  try {
    const supabase = client ?? await createSupabaseServerClient();
    const semesterId = await resolveSemesterFilter(supabase, options);
    let classesQuery = supabase
      .from("classes")
      .select(CLASS_SELECT)
      .order("created_at", { ascending: true });
    if (semesterId) {
      classesQuery = classesQuery.eq("semester_id", semesterId);
    }
    const [initialClassesResult, availabilityResult] = await Promise.all([
      classesQuery,
      supabase
        .from("class_catalog_availability")
        .select("class_id, enrolled_count, pending_count, waitlist_count, reserved_count, seats_remaining, availability_label"),
    ]);
    let classesResult = initialClassesResult;
    if (classesResult.error && (!semesterId || classQueryNeedsSchemaFallback(classesResult.error))) {
      classesResult = await supabase
        .from("classes")
        .select(CLASS_SELECT_BASE)
        .order("created_at", { ascending: true });
    }

    if (classesResult.error) {
      return unavailableList();
    }

    if (availabilityResult.error) {
      return unavailableList();
    }

    const data = classesResult.data;
    if (!data?.length) {
      return { items: [], source: "remote" };
    }

    const countsByClassId = availabilityByClassId(availabilityResult.data as unknown as Record<string, unknown>[]);
    if (data.some((row) => !countsByClassId.has(String((row as Record<string, unknown>).id ?? "")))) {
      return unavailableList();
    }
    const mapped = data
      .map((row) => {
        const classRow = row as unknown as Record<string, unknown>;
        const id = classRow.id == null ? "" : String(classRow.id);
        return mapClassRow({
          ...flattenClassBaseRow(classRow),
          ...availabilityFields(countsByClassId.get(id)),
        });
      })
      .filter((x): x is SchoolClassRow => x !== null);

    if (mapped.length === 0) {
      return unavailableList();
    }
    return { items: mapped, source: "remote" };
  } catch {
    return unavailableList();
  }
}

/** Loads classes for /dashboard/classes. */
export async function fetchClasses(): Promise<SchoolClassRow[]> {
  const { items } = await loadClassesResolved();
  return items;
}

export async function fetchClassesResolved(options?: ClassQueryOptions): Promise<ResolvedList<SchoolClassRow>> {
  return loadClassesResolved(undefined, options);
}

export async function fetchClassesForClientResolved(
  client: ClassReadClient,
  options?: ClassQueryOptions,
): Promise<ResolvedList<SchoolClassRow>> {
  return loadClassesResolved(client, options);
}

export async function fetchAdminClassesResolved(options?: ClassQueryOptions): Promise<ResolvedList<SchoolClassRow>> {
  const access = await requireAdminReadClient();
  if (!access) return unavailableList();
  return loadClassesResolved(access.client, options);
}

function mapClassOptionRow(row: Record<string, unknown>): SchoolClassOptionRow | null {
  if (row.id == null || String(row.id) === "") return null;
  const semester = firstRel<Record<string, unknown>>(row.semesters);
  const block = String(row.block ?? "").trim();
  const level = String(row.level ?? "").trim();
  return {
    id: String(row.id),
    semesterId: String(semester?.id ?? row.semester_id ?? ""),
    semesterName: String(semester?.name ?? row.semester_name ?? ""),
    semesterStartsOn: String(semester?.starts_on ?? row.semester_starts_on ?? "").slice(0, 10),
    semesterEndsOn: String(semester?.ends_on ?? row.semester_ends_on ?? "").slice(0, 10),
    name: String(row.name ?? ""),
    program: normalizeProgram(row.program),
    capacity: numberField(row, "capacity") ?? 0,
    block,
    level,
    schedule: formatClassScheduleLabel({ block, level, scheduleSummary: row.schedule_summary }),
  };
}

async function loadClassOptionsResolved(client?: ClassReadClient, options?: ClassQueryOptions): Promise<ResolvedList<SchoolClassOptionRow>> {
  if (!isSupabaseConfigured()) return unavailableList();
  try {
    const supabase = client ?? await createSupabaseServerClient();
    const semesterId = await resolveSemesterFilter(supabase, options);
    let query = supabase
      .from("classes")
      .select("id, semester_id, name, program, capacity, block, level, schedule_summary, semesters ( id, name, starts_on, ends_on, is_current )")
      .order("created_at", { ascending: true });
    if (semesterId) {
      query = query.eq("semester_id", semesterId);
    }
    const initial = await query;
    let data = initial.data as unknown as Record<string, unknown>[] | null;
    let error = initial.error;
    if (error && (!semesterId || classQueryNeedsSchemaFallback(error))) {
      const fallback = await supabase
        .from("classes")
        .select("id, name, program, capacity, block, level, schedule_summary")
        .order("created_at", { ascending: true });
      data = fallback.data as unknown as Record<string, unknown>[] | null;
      error = fallback.error;
    }
    if (error) return unavailableList();
    return {
      items: (data ?? [])
        .map(mapClassOptionRow)
        .filter((row): row is SchoolClassOptionRow => row !== null),
      source: "remote",
    };
  } catch {
    return unavailableList();
  }
}

export async function fetchAdminClassOptionsResolved(options?: ClassQueryOptions): Promise<ResolvedList<SchoolClassOptionRow>> {
  const access = await requireAdminReadClient();
  if (!access) return unavailableList();
  return loadClassOptionsResolved(access.client, options);
}

function unavailableRoster(): ResolvedList<ClassRosterStudent> {
  return unavailableList();
}

function mapRosterEnrollmentRow(row: Record<string, unknown>): ClassRosterStudent | null {
  const student = firstRel<Record<string, unknown>>(row.students);
  const id = student?.id ?? row.student_id ?? row.id;
  if (id == null || String(id) === "") return null;
  return {
    id: String(id),
    name: String(student?.display_name ?? row.student_name ?? ""),
    parent: parentContactFromStudentRow(student, { name: row.parent_name }).name,
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
    return unavailableRoster();
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
          ${STUDENT_PARENT_CONTACT_SELECT},
          age_years,
          level,
          learning_profile,
          support_notes
        )
      `,
      )
      .eq("class_id", id)
      .order("created_at", { ascending: true });

    if (error) return unavailableRoster();
    if (!data?.length) return { items: [], source: "remote" };

    const mapped = data
      .map((row) => mapRosterEnrollmentRow(row as unknown as Record<string, unknown>))
      .filter((x): x is ClassRosterStudent => x !== null);
    if (mapped.length === 0) return unavailableRoster();
    return { items: mapped, source: "remote" };
  } catch {
    return unavailableRoster();
  }
}
