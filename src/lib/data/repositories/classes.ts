import "server-only";

import type { ResolvedList } from "@/lib/data/fetch-source";
import type {
  ClassRosterStatus,
  ClassRosterStudent,
  ProgramTrack,
  SchoolClassRow,
} from "@/lib/data/types";
import { requireAdminReadClient, type AdminReadClient } from "@/lib/api/admin-read";
import { isSupabaseConfigured, unavailableList } from "@/lib/data/env";
import { firstRel } from "@/lib/data/repositories/relations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ClassReadClient = Awaited<ReturnType<typeof createSupabaseServerClient>> | AdminReadClient;

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

function activeStatus(raw: unknown): boolean {
  const status = String(raw ?? "approved").toLowerCase();
  return status === "approved" || status === "pending";
}

function pendingStatus(raw: unknown): boolean {
  return String(raw ?? "").toLowerCase() === "pending";
}

function waitlistedStatus(raw: unknown): boolean {
  const status = String(raw ?? "").toLowerCase();
  return status === "waitlisted" || status === "waitlist";
}

function studentKey(raw: Record<string, unknown>, fallbackPrefix: string, index: number): string {
  return String(raw.student_id ?? raw.id ?? `${fallbackPrefix}-${index}`);
}

function splitSeatCounts(input: {
  capacity: number;
  enrollments: unknown;
  classRequests: unknown;
}): {
  enrolledCount: number;
  pendingCount: number;
  waitlistCount: number;
  reservedCount: number;
  seatsRemaining: number;
} {
  const approvedEnrolled = new Set<string>();
  const pendingHolds = new Set<string>();
  const waitlisted = new Set<string>();
  const reserved = new Set<string>();

  const enrollments = Array.isArray(input.enrollments) ? input.enrollments : [];
  enrollments.forEach((raw, index) => {
    if (raw && typeof raw === "object" && "status" in raw) {
      const row = raw as Record<string, unknown>;
      const key = studentKey(row, "enrollment", index);
      if (activeStatus(row.status)) reserved.add(key);
      if (pendingStatus(row.status)) pendingHolds.add(key);
      if (waitlistedStatus(row.status)) waitlisted.add(key);
      if (String(row.status ?? "approved").toLowerCase() === "approved") approvedEnrolled.add(key);
      return;
    }
    if (raw && typeof raw === "object") {
      const key = studentKey(raw as Record<string, unknown>, "enrollment", index);
      reserved.add(key);
      approvedEnrolled.add(key);
    }
  });

  const classRequests = Array.isArray(input.classRequests) ? input.classRequests : [];
  classRequests.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") return;
    const row = raw as Record<string, unknown>;
    const key = studentKey(row, "request", index);
    if (activeStatus(row.status)) reserved.add(key);
    if (pendingStatus(row.status)) pendingHolds.add(key);
    if (waitlistedStatus(row.status)) waitlisted.add(key);
  });

  const reservedCount = Math.max(0, reserved.size);
  return {
    enrolledCount: Math.max(0, approvedEnrolled.size),
    pendingCount: Math.max(0, pendingHolds.size),
    waitlistCount: Math.max(0, waitlisted.size),
    reservedCount,
    seatsRemaining: Math.max(0, input.capacity - reservedCount),
  };
}

const CLASS_SELECT = `
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
  )
`;

const CLASS_SELECT_WITH_HOLDS = `
  ${CLASS_SELECT},
  enrollments ( id, student_id, status ),
  class_requests ( id, student_id, status )
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

function flattenClassJoinRow(row: Record<string, unknown>): Record<string, unknown> {
  const base = flattenClassBaseRow(row);
  const enrollments = row.enrollments as unknown[] | null;
  const classRequests = row.class_requests as unknown[] | null;
  const capacity = numberField(row, "capacity") ?? 1;
  const seatCounts = splitSeatCounts({ capacity, enrollments, classRequests });

  return {
    ...base,
    enrolled_count: seatCounts.enrolledCount,
    pending_count: seatCounts.pendingCount,
    waitlist_count: seatCounts.waitlistCount,
    reserved_count: seatCounts.reservedCount,
    seats_remaining: seatCounts.seatsRemaining,
    availability_label: formatAvailabilityLabel(seatCounts.seatsRemaining, capacity),
    level: row.level,
    block: row.block,
    location: row.location,
    description: row.description,
    prerequisites: row.prerequisites,
    schedule_summary: row.schedule_summary,
  };
}

async function loadClassesWithJoinCounts(
  supabase: ClassReadClient,
): Promise<ResolvedList<SchoolClassRow>> {
  const { data, error } = await supabase
    .from("classes")
    .select(CLASS_SELECT_WITH_HOLDS)
    .order("created_at", { ascending: true });

  if (error) return unavailableList();
  if (!data?.length) return { items: [], source: "remote" };

  const mapped = data
    .map((row) =>
      mapClassRow(flattenClassJoinRow(row as unknown as Record<string, unknown>)),
    )
    .filter((x): x is SchoolClassRow => x !== null);

  if (mapped.length === 0) return unavailableList();
  return { items: mapped, source: "remote" };
}

async function loadClassesResolved(client?: ClassReadClient): Promise<ResolvedList<SchoolClassRow>> {
  if (!isSupabaseConfigured()) {
    return unavailableList();
  }

  try {
    const supabase = client ?? await createSupabaseServerClient();
    const [classesResult, availabilityResult] = await Promise.all([
      supabase
        .from("classes")
        .select(CLASS_SELECT)
        .order("created_at", { ascending: true }),
      supabase
        .from("class_catalog_availability")
        .select("class_id, enrolled_count, pending_count, waitlist_count, reserved_count, seats_remaining, availability_label"),
    ]);

    if (classesResult.error) {
      return unavailableList();
    }

    if (availabilityResult.error) {
      return loadClassesWithJoinCounts(supabase);
    }

    const data = classesResult.data;
    if (!data?.length) {
      return { items: [], source: "remote" };
    }

    const countsByClassId = availabilityByClassId(availabilityResult.data as unknown as Record<string, unknown>[]);
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

export async function fetchClassesResolved(): Promise<ResolvedList<SchoolClassRow>> {
  return loadClassesResolved();
}

export async function fetchAdminClassesResolved(): Promise<ResolvedList<SchoolClassRow>> {
  const access = await requireAdminReadClient();
  if (!access) return unavailableList();
  return loadClassesResolved(access.client);
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
