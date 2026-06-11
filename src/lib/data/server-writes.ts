import "server-only";

import { mapClassRow } from "@/lib/data/repositories/classes";
import { mapNotificationRow } from "@/lib/data/repositories/notifications";
import { mapParentRow } from "@/lib/data/repositories/parents";
import { firstRel } from "@/lib/data/repositories/relations";
import { mapRequestRow } from "@/lib/data/repositories/requests";
import { mapStudentRow, STUDENT_SELECT } from "@/lib/data/repositories/students";
import { mapTeacherRow } from "@/lib/data/repositories/teachers";
import {
  authUserIdForEmail,
  cleanAccountEmail,
  ensureParentAccountForEmail,
  isValidAccountEmail,
  normalizeAccountDisplayName,
  temporaryAccountPassword,
} from "@/lib/data/account-materialization";
import { isSupabaseConfigured } from "@/lib/data/env";
import { parentContactFromStudentRow, STUDENT_PARENT_CONTACT_SELECT } from "@/lib/data/parent-contact";
import { isSupabaseAdminConfigured } from "@/lib/data/server-env";
import { scheduleSlotForClassFields } from "@/lib/schedule-slots";
import type {
  ClassRosterStatus,
  ClassRosterStudent,
  DashboardNotification,
  EnrichmentRequestRow,
  ParentSummary,
  ScheduleCalendarEvent,
  SchoolClassRow,
  SemesterRow,
  StudentListItem,
  TeacherRow,
} from "@/lib/data/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type WriteFail = { ok: false; message: string };
export type WriteOk<T> = { ok: true; row: T };

type SupabaseMutationClient =
  | Awaited<ReturnType<typeof createSupabaseServerClient>>
  | ReturnType<typeof createSupabaseAdminClient>;

type PlacementClassRow = {
  id?: unknown;
  name?: unknown;
  program?: unknown;
  block?: unknown;
  level?: unknown;
  schedule_summary?: unknown;
  schedule_days?: unknown;
  semester_id?: unknown;
};

function isSemesterSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  const code = String(record.code ?? "");
  const message = String(record.message ?? record.details ?? record.hint ?? "").toLowerCase();
  return (
    code === "42703" ||
    code === "PGRST200" ||
    code === "PGRST205" ||
    message.includes("semester_id") ||
    message.includes("semesters") ||
    message.includes("schema cache") ||
    message.includes("relationship")
  );
}

function classBelongsToSemester(row: Record<string, unknown> | null | undefined, semesterId: string | null): boolean {
  if (!semesterId) return true;
  if (!row || !("semester_id" in row)) return false;
  return String(row.semester_id ?? "") === semesterId;
}

function cleanContactEmail(raw: string | null | undefined): string {
  return cleanAccountEmail(raw);
}

function isValidContactEmail(email: string): boolean {
  return isValidAccountEmail(email);
}

function workflowStatusForRoster(status: ClassRosterStatus) {
  if (status === "Approved") return "approved";
  if (status === "Waitlisted") return "waitlisted";
  if (status === "Rejected") return "rejected";
  return "pending";
}

function rosterStatusFromDb(raw: unknown): ClassRosterStatus {
  const status = String(raw ?? "").toLowerCase();
  if (status === "approved") return "Approved";
  if (status === "waitlisted" || status === "waitlist") return "Waitlisted";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

function workflowStatusForRequest(status: EnrichmentRequestRow["status"]): "pending" | "approved" | "waitlisted" | "rejected" {
  if (status === "Approved") return "approved";
  if (status === "Waitlisted") return "waitlisted";
  if (status === "Rejected") return "rejected";
  return "pending";
}

function waitlistOptionLabel(option: string): string {
  return `waitlist:${option}`;
}

function isWaitlistOptionLabel(option: unknown): boolean {
  return String(option ?? "").trim().toLowerCase().startsWith("waitlist:");
}

function requestOptionLabel(choice: { option: string; waitlist?: boolean }): string {
  return choice.waitlist ? waitlistOptionLabel(choice.option) : choice.option;
}

function classPlacementSlot(row: PlacementClassRow): string | null {
  const source = `${String(row.block ?? "")} ${String(row.level ?? "")} ${String(row.schedule_summary ?? "")}`.toLowerCase();
  if (!/\b(?:block|b)\s*[1-4]\b/.test(source)) return null;
  return scheduleSlotForClassFields({
    block: row.block,
    scheduleSummary: [row.level, row.schedule_summary].filter(Boolean).join(" "),
  });
}

function blockNumberForPlacement(row: PlacementClassRow): number | null {
  const source = `${String(row.block ?? "")} ${String(row.level ?? "")} ${String(row.schedule_summary ?? "")}`.toLowerCase();
  const parsed = Number(
    source.match(/\bblock\s*([1-4])\b/)?.[1] ??
      source.match(/\bb([1-4])\b/)?.[1] ??
      source.match(/^\s*([1-4])\s*$/)?.[1],
  );
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 4 ? parsed : null;
}

function classPlacementSlots(row: PlacementClassRow): string[] {
  const blockNumber = blockNumberForPlacement(row);
  const rawDays = Array.isArray(row.schedule_days) ? row.schedule_days : [];
  const daySuffixes = rawDays
    .map((value) => String(value ?? "").trim().toUpperCase())
    .map((day) =>
      day === "T" || day === "TUE" || day === "TUESDAY" ? "Tue" :
      day === "W" || day === "WED" || day === "WEDNESDAY" ? "Wed" :
      day === "TH" || day === "THU" || day === "THURSDAY" ? "Thu" :
      null,
    )
    .filter((value): value is "Tue" | "Wed" | "Thu" => value !== null);

  if (blockNumber && daySuffixes.length > 0) {
    return daySuffixes.map((day) => `b${blockNumber}${day}`);
  }

  const slot = classPlacementSlot(row);
  return slot ? [slot] : [];
}

function placementSlotsOverlap(left: PlacementClassRow, right: PlacementClassRow): boolean {
  const leftSlots = new Set(classPlacementSlots(left));
  if (leftSlots.size === 0) return false;
  return classPlacementSlots(right).some((slot) => leftSlots.has(slot));
}

async function ensureApprovedRosterPlacementAllowed(
  supabase: SupabaseMutationClient,
  input: {
    classId: string;
    studentId: string;
    existingApprovedInClass?: boolean;
    pendingRequestConsumesSeat?: boolean;
  },
): Promise<WriteFail | { ok: true }> {
  if (input.existingApprovedInClass) return { ok: true };

  const [{ data: targetClass, error: targetClassError }, { data: availability, error: availabilityError }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, program, block, level, schedule_summary, schedule_days")
      .eq("id", input.classId)
      .maybeSingle(),
    supabase
      .from("class_catalog_availability")
      .select("class_id, seats_remaining, availability_label")
      .eq("class_id", input.classId)
      .maybeSingle(),
  ]);
  if (targetClassError) return { ok: false, message: targetClassError.message };
  if (availabilityError) return { ok: false, message: availabilityError.message };
  if (!targetClass) return { ok: false, message: "Class not found" };

  const seatsRemaining =
    Math.max(0, Math.floor(Number((availability as Record<string, unknown> | null)?.seats_remaining ?? 0))) +
    (input.pendingRequestConsumesSeat ? 1 : 0);
  if (seatsRemaining <= 0) {
    return { ok: false, message: `${String((targetClass as Record<string, unknown>).name ?? "This class")} is full.` };
  }

  if (classPlacementSlots(targetClass as PlacementClassRow).length === 0) return { ok: true };

  const { data: enrollments, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("class_id, status, classes ( id, name, program, block, level, schedule_summary, schedule_days )")
    .eq("student_id", input.studentId)
    .eq("status", "approved");
  if (enrollmentError) return { ok: false, message: enrollmentError.message };

  for (const row of (enrollments ?? []) as unknown as Record<string, unknown>[]) {
    const classId = String(row.class_id ?? "");
    if (classId === input.classId) continue;
    const classRow = Array.isArray(row.classes) ? row.classes[0] : row.classes;
    if (placementSlotsOverlap(targetClass as PlacementClassRow, (classRow ?? {}) as PlacementClassRow)) {
      const className = String((classRow as Record<string, unknown> | null)?.name ?? "another approved class");
      return { ok: false, message: `Student already has ${className} in this schedule slot.` };
    }
  }

  return { ok: true };
}

function normalizeCapacity(raw: unknown): number {
  const capacity = Number(raw);
  return Number.isFinite(capacity) && capacity > 0 ? Math.floor(capacity) : 30;
}

function mapSemesterWriteRow(row: Record<string, unknown>): SemesterRow | null {
  const id = String(row.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    name: String(row.name ?? "").trim(),
    startsOn: String(row.starts_on ?? "").slice(0, 10),
    endsOn: String(row.ends_on ?? "").slice(0, 10),
    isCurrent: Boolean(row.is_current),
  };
}

function normalizeDateOnly(raw: string): string | null {
  const trimmed = raw.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function normalizeOptionalAge(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function optionalClassAgeLimit(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeScheduleDays(raw: unknown): string[] {
  const values = Array.isArray(raw) ? raw : String(raw ?? "").split(/[,\n]/);
  const allowed = new Set(["M", "T", "W", "TH", "F"]);
  const normalized: string[] = [];
  for (const value of values) {
    const day = String(value ?? "").trim().toUpperCase();
    if (!day) continue;
    const mapped =
      day === "MON" || day === "MONDAY" ? "M" :
      day === "TUE" || day === "TUESDAY" ? "T" :
      day === "WED" || day === "WEDNESDAY" ? "W" :
      day === "THU" || day === "THURSDAY" ? "TH" :
      day === "FRI" || day === "FRIDAY" ? "F" :
      day;
    if (allowed.has(mapped) && !normalized.includes(mapped)) normalized.push(mapped);
  }
  return normalized;
}

function validateClassScheduleInput(input: {
  schedule: string;
  block?: string;
  scheduleDays?: string[];
}): WriteFail | { ok: true } {
  if (!input.block?.trim()) return { ok: false, message: "Choose a schedule block before saving the class." };
  if (!input.scheduleDays?.length && !input.schedule.trim()) {
    return { ok: false, message: "Choose at least one meeting day or schedule summary before saving the class." };
  }
  return { ok: true };
}

async function resolveCurrentSemesterId(supabase: SupabaseMutationClient): Promise<string | null> {
  const { data, error } = await supabase
    .from("semesters")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();
  if (error || !data || !("id" in data)) return null;
  return String((data as { id: unknown }).id);
}

async function currentUserIsAdmin(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return data?.role === "admin";
}

async function mutationClientForParentContactUpdate(): Promise<
  | {
      ok: true;
      client: SupabaseMutationClient;
      auditClient: Awaited<ReturnType<typeof createSupabaseServerClient>>;
      actorId?: string;
    }
  | WriteFail
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    const isAdmin = await currentUserIsAdmin(supabase, user.id);
    if (isAdmin && isSupabaseAdminConfigured()) {
      return { ok: true, client: createSupabaseAdminClient(), auditClient: supabase, actorId: user.id };
    }
    return { ok: true, client: supabase, auditClient: supabase, actorId: user.id };
  }

  return { ok: false, message: "Not signed in" };
}

async function fetchMappedStudent(
  client: SupabaseMutationClient,
  studentId: string,
): Promise<WriteOk<StudentListItem> | WriteFail> {
  const { data, error } = await client
    .from("students")
    .select(STUDENT_SELECT)
    .eq("id", studentId)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "Student not found after update" };
  const mapped = mapStudentRow(data as Record<string, unknown>);
  if (!mapped) return { ok: false, message: "Could not map updated student" };
  return { ok: true, row: mapped };
}

async function writeAuditEvent(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  input: {
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return;
    await supabase.from("audit_events").insert({
      actor_profile_id: user.id,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? "",
      metadata: input.metadata ?? {},
    });
  } catch {
    /* Audit writes should not block the primary workflow. */
  }
}

async function resolveTeacherIdByDisplayName(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  displayName: string,
): Promise<string | null> {
  const term = displayName.trim().toLowerCase();
  if (!term) return null;
  const { data: rows } = await supabase.from("teachers").select("id, profiles ( display_name )").limit(80);
  const found = rows?.find((row) => {
    const prof = row.profiles as { display_name?: string } | null;
    const n = String(prof?.display_name ?? "").toLowerCase();
    return n === term || n.includes(term) || term.includes(n);
  });
  return found?.id ?? null;
}

export async function serverUpdateSemester(input: {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  isCurrent?: boolean;
}): Promise<WriteOk<SemesterRow> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };

  const id = input.id.trim();
  const startsOn = normalizeDateOnly(input.startsOn);
  const endsOn = normalizeDateOnly(input.endsOn);
  const name = input.name.trim();
  if (!id) return { ok: false, message: "Missing semester id" };
  if (!name) return { ok: false, message: "Semester name is required" };
  if (!startsOn || !endsOn) return { ok: false, message: "Use yyyy-mm-dd dates for the semester range" };
  if (Date.parse(`${endsOn}T00:00:00Z`) < Date.parse(`${startsOn}T00:00:00Z`)) {
    return { ok: false, message: "Semester end date must be on or after the start date" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id || !(await currentUserIsAdmin(supabase, user.id))) {
      return { ok: false, message: "Only admins can update semesters" };
    }

    if (input.isCurrent) {
      const { error: clearError } = await supabase
        .from("semesters")
        .update({ is_current: false, updated_at: new Date().toISOString() })
        .neq("id", id);
      if (clearError) return { ok: false, message: clearError.message };
    }

    const payload: Record<string, unknown> = {
      name,
      starts_on: startsOn,
      ends_on: endsOn,
      updated_at: new Date().toISOString(),
    };
    if (input.isCurrent) payload.is_current = true;
    const { data, error } = await supabase
      .from("semesters")
      .update(payload)
      .eq("id", id)
      .select("id, name, starts_on, ends_on, is_current")
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "Semester not found" };
    const mapped = mapSemesterWriteRow(data as unknown as Record<string, unknown>);
    if (!mapped) return { ok: false, message: "Could not map updated semester" };
    await writeAuditEvent(supabase, {
      action: "semester.update",
      entityType: "semester",
      entityId: mapped.id,
      metadata: { name: mapped.name, startsOn: mapped.startsOn, endsOn: mapped.endsOn, isCurrent: mapped.isCurrent },
    });
    return { ok: true, row: mapped };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function serverInsertClass(input: {
  name: string;
  teacher: string;
  semesterId?: string;
  capacity?: number;
  schedule: string;
  status: SchoolClassRow["status"];
  isActive?: boolean;
  archivedAt?: string | null;
  track?: "core" | "enrichment";
  description?: string;
  level?: string;
  block?: string;
  scheduleDays?: string[];
  location?: string;
  room?: string;
  minAgeYears?: number | null;
  maxAgeYears?: number | null;

}): Promise<WriteOk<SchoolClassRow> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const capacity = normalizeCapacity(input.capacity);
  const scheduleDays = normalizeScheduleDays(input.scheduleDays);
  const scheduleValid = validateClassScheduleInput({ schedule: input.schedule, block: input.block, scheduleDays });
  if (!scheduleValid.ok) return scheduleValid;
  const minAgeYears = normalizeOptionalAge(input.minAgeYears);
  const maxAgeYears = normalizeOptionalAge(input.maxAgeYears);
  if (minAgeYears != null && maxAgeYears != null && maxAgeYears < minAgeYears) {
    return { ok: false, message: "Maximum age must be greater than or equal to minimum age." };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const teacherId = await resolveTeacherIdByDisplayName(supabase, input.teacher);
    if (!teacherId) {
      return {
        ok: false,
        message:
          "Could not match teacher name to a staff profile. Add the teacher first or use an exact display name from the roster.",
      };
    }
    const semesterId = input.semesterId?.trim() || await resolveCurrentSemesterId(supabase);
    if (!semesterId) return { ok: false, message: "Choose a current semester before creating classes." };
    const payload: Record<string, unknown> = {
      name: input.name.trim(),
      teacher_id: teacherId,
      semester_id: semesterId,
      program: (input.track ?? "core") as "core" | "enrichment",
      capacity,
      schedule_summary: input.schedule.trim(),
      schedule_days: scheduleDays,
      status: input.status === "Full" ? ("full" as const) : ("active" as const),
      is_active: input.isActive ?? true,
      archived_at: input.archivedAt ?? null,
      min_age_years: minAgeYears,
      max_age_years: maxAgeYears,
    };
    if (input.description != null) payload.description = input.description.trim();
    if (input.level != null) payload.level = input.level.trim();
    if (input.block != null) payload.block = input.block.trim();
    const room = String(input.room ?? input.location ?? "").trim();
    if (room) {
      payload.room = room;
      payload.location = String(input.location ?? input.room ?? "").trim() || room;
    }

    const { data, error } = await supabase.from("classes").insert(payload).select("*").maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "No row returned" };
    const mapped = mapClassRow(
      await flattenClassRowForMap(supabase, data as Record<string, unknown>),
    );
    if (!mapped) return { ok: false, message: "Could not map saved class" };
    await writeAuditEvent(supabase, {
      action: "class.create",
      entityType: "class",
      entityId: mapped.id,
      metadata: {
        name: mapped.name,
        program: mapped.program,
        semesterId: mapped.semesterId,
        teacherId: mapped.teacherId ?? null,
        block: mapped.block,
        scheduleDays: mapped.scheduleDays,
        room: mapped.room ?? null,
        isActive: mapped.isActive,
        archivedAt: mapped.archivedAt ?? null,
      },
    });
    return { ok: true, row: mapped };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

async function flattenClassRowForMap(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  row: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const id = row.id;
  if (id == null) return row;
  const { data: cls } = await supabase
    .from("classes")
    .select(
      `
      *,
      semesters ( id, name, starts_on, ends_on, is_current ),
      teachers ( profiles ( display_name ) ),
      enrollments ( id, status )
    `,
    )
    .eq("id", String(id))
    .maybeSingle();
  if (!cls) return row;
  const teachers = cls.teachers as Record<string, unknown> | Record<string, unknown>[] | null;
  const t = Array.isArray(teachers) ? teachers[0] : teachers;
  let teacherName = "";
  if (t && typeof t === "object") {
    const profs = (t as { profiles?: unknown }).profiles;
    const prof = Array.isArray(profs) ? profs[0] : profs;
    if (prof && typeof prof === "object" && prof !== null && "display_name" in prof) {
      teacherName = String((prof as { display_name: unknown }).display_name);
    }
  }
  const enrollments = cls.enrollments as unknown[] | null;
  return {
    ...cls,
    teacher_name: teacherName,
    enrolled_count: Array.isArray(enrollments) ? enrollments.length : 0,
  } as Record<string, unknown>;
}

export async function serverUpdateClass(
  id: string,
  input: {
    name: string;
    teacher: string;
    semesterId?: string;
    capacity?: number;
    schedule: string;
    status: SchoolClassRow["status"];
    isActive?: boolean;
    archivedAt?: string | null;
    track?: "core" | "enrichment";
    description?: string;
    level?: string;
    block?: string;
    scheduleDays?: string[];
    location?: string;
    room?: string;
    minAgeYears?: number | null;
    maxAgeYears?: number | null;

  },
): Promise<WriteOk<SchoolClassRow> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const capacity = normalizeCapacity(input.capacity);
  const scheduleDays = normalizeScheduleDays(input.scheduleDays);
  const scheduleValid = validateClassScheduleInput({ schedule: input.schedule, block: input.block, scheduleDays });
  if (!scheduleValid.ok) return scheduleValid;
  const minAgeYears = normalizeOptionalAge(input.minAgeYears);
  const maxAgeYears = normalizeOptionalAge(input.maxAgeYears);
  if (minAgeYears != null && maxAgeYears != null && maxAgeYears < minAgeYears) {
    return { ok: false, message: "Maximum age must be greater than or equal to minimum age." };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const teacherId = await resolveTeacherIdByDisplayName(supabase, input.teacher);
    if (!teacherId) {
      return { ok: false, message: "Could not match teacher name for update." };
    }
    const payload: Record<string, unknown> = {
      name: input.name.trim(),
      teacher_id: teacherId,
      program: (input.track ?? "core") as "core" | "enrichment",
      capacity,
      schedule_summary: input.schedule.trim(),
      schedule_days: scheduleDays,
      status: input.status === "Full" ? ("full" as const) : ("active" as const),
      is_active: input.isActive ?? true,
      archived_at: input.archivedAt ?? null,
      min_age_years: minAgeYears,
      max_age_years: maxAgeYears,
      updated_at: new Date().toISOString(),
    };
    if (input.semesterId?.trim()) payload.semester_id = input.semesterId.trim();
    if (input.description != null) payload.description = input.description.trim();
    if (input.level != null) payload.level = input.level.trim();
    if (input.block != null) payload.block = input.block.trim();
    const room = String(input.room ?? input.location ?? "").trim();
    payload.room = room || null;
    payload.location = String(input.location ?? input.room ?? "").trim() || room || null;

    const { data, error } = await supabase
      .from("classes")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "No row updated" };
    const mapped = mapClassRow(
      await flattenClassRowForMap(supabase, data as Record<string, unknown>),
    );
    if (!mapped) return { ok: false, message: "Could not map saved class" };
    await writeAuditEvent(supabase, {
      action: "class.update",
      entityType: "class",
      entityId: mapped.id,
      metadata: {
        name: mapped.name,
        program: mapped.program,
        semesterId: mapped.semesterId,
        teacherId: mapped.teacherId ?? null,
        block: mapped.block,
        scheduleDays: mapped.scheduleDays,
        room: mapped.room ?? null,
        isActive: mapped.isActive,
        archivedAt: mapped.archivedAt ?? null,
      },
    });
    return { ok: true, row: mapped };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function serverDeleteClass(id: string): Promise<{ ok: true } | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  try {
    const supabase = await createSupabaseServerClient();
    const archivedAt = new Date().toISOString();
    const { error } = await supabase
      .from("classes")
      .update({ is_active: false, archived_at: archivedAt, updated_at: archivedAt })
      .eq("id", id);
    if (error) return { ok: false, message: error.message };
    await writeAuditEvent(supabase, {
      action: "class.archive",
      entityType: "class",
      entityId: id,
      metadata: { source: "delete", archivedAt },
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function serverSetClassLifecycle(
  id: string,
  input: { isActive: boolean; archived?: boolean },
): Promise<WriteOk<SchoolClassRow> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  try {
    const supabase = await createSupabaseServerClient();
    const timestamp = new Date().toISOString();
    const payload = input.archived
      ? { is_active: false, archived_at: timestamp, updated_at: timestamp }
      : { is_active: input.isActive, archived_at: null, updated_at: timestamp };
    const { data, error } = await supabase
      .from("classes")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "No row updated" };
    const mapped = mapClassRow(await flattenClassRowForMap(supabase, data as Record<string, unknown>));
    if (!mapped) return { ok: false, message: "Could not map saved class" };
    await writeAuditEvent(supabase, {
      action: input.archived ? "class.archive" : input.isActive ? "class.activate" : "class.deactivate",
      entityType: "class",
      entityId: mapped.id,
      metadata: { name: mapped.name, isActive: mapped.isActive, archivedAt: mapped.archivedAt ?? null },
    });
    return { ok: true, row: mapped };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function serverInsertStudent(input: {
  name: string;
  parent: string;
  parentEmail?: string;
  level: string;
  track: "core" | "enrichment";
  notes?: string;
}): Promise<WriteOk<StudentListItem> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const parentEmail = cleanContactEmail(input.parentEmail);
  if (input.parentEmail !== undefined && input.parentEmail.trim() && !isValidContactEmail(parentEmail)) {
    return { ok: false, message: "Enter a valid parent email address" };
  }
  try {
    const resolved = await mutationClientForParentContactUpdate();
    if (!resolved.ok) return resolved;
    const { client, auditClient } = resolved;
    const payload = {
      display_name: input.name.trim(),
      guardian_label: input.parent.trim() || null,
      level: input.level.trim(),
      track: input.track,
      support_notes: input.notes?.trim() ?? "",
    };
    const { data, error } = await client.from("students").insert(payload).select("*").maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "No row returned" };

    const studentId = String((data as { id?: unknown }).id ?? "");
    if (parentEmail && studentId) {
      const parent = await ensureParentAccountForEmail(client, {
        displayName: input.parent.trim() || "Parent",
        email: parentEmail,
      });
      if (!parent.ok) return parent;

      const { error: linkError } = await client.from("parent_students").insert({
        parent_id: parent.parentId,
        student_id: studentId,
      });
      if (linkError) return { ok: false, message: linkError.message };
    }

    const mappedResult = studentId ? await fetchMappedStudent(client, studentId) : { ok: false as const, message: "No row returned" };
    if (!mappedResult.ok) return mappedResult;
    const mapped = mappedResult.row;
    await writeAuditEvent(auditClient, {
      action: "student.create",
      entityType: "student",
      entityId: mapped.id,
      metadata: { name: mapped.name, track: mapped.track, linkedParentEmail: Boolean(parentEmail) },
    });
    return { ok: true, row: mapped };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function serverInsertParent(input: {
  name: string;
  email: string;
}): Promise<WriteOk<ParentSummary> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const access = await mutationClientForParentContactUpdate();
  if (!access.ok) return access;
  const ensured = await ensureParentAccountForEmail(access.client, {
    displayName: input.name,
    email: input.email,
  });
  if (!ensured.ok) return ensured;
  const { data, error } = await access.client
    .from("parents")
    .select(
      `
      id,
      created_at,
      profiles ( display_name, email ),
      parent_students (
        students ( id, display_name )
      )
    `,
    )
    .eq("id", ensured.parentId)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "Parent not found after import" };
  const mapped = mapParentRow(data as Record<string, unknown>);
  if (!mapped) return { ok: false, message: "Could not map imported parent" };
  await writeAuditEvent(access.auditClient, {
    action: "parent.create",
    entityType: "parent",
    entityId: mapped.id,
    metadata: { name: mapped.name, email: mapped.email },
  });
  return { ok: true, row: mapped };
}

async function fetchMappedParent(
  client: SupabaseMutationClient,
  parentId: string,
): Promise<WriteOk<ParentSummary> | WriteFail> {
  const { data, error } = await client
    .from("parents")
    .select(
      `
      id,
      created_at,
      profiles ( display_name, email ),
      parent_students (
        students ( id, display_name )
      )
    `,
    )
    .eq("id", parentId)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "Parent not found" };
  const mapped = mapParentRow(data as Record<string, unknown>);
  if (!mapped) return { ok: false, message: "Could not map parent" };
  return { ok: true, row: mapped };
}

export async function serverUpdateParent(input: {
  parentId: string;
  name: string;
  email: string;
}): Promise<WriteOk<ParentSummary> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const parentId = input.parentId.trim();
  const displayName = normalizeAccountDisplayName(input.name);
  const email = cleanAccountEmail(input.email);
  if (!parentId) return { ok: false, message: "Missing parent id" };
  if (!displayName) return { ok: false, message: "Parent name is required" };
  if (!isValidAccountEmail(email)) return { ok: false, message: "Enter a valid parent email address" };

  const access = await mutationClientForParentContactUpdate();
  if (!access.ok) return access;

  const { data: parent, error: parentError } = await access.client
    .from("parents")
    .select("id, profile_id")
    .eq("id", parentId)
    .maybeSingle();
  if (parentError) return { ok: false, message: parentError.message };
  const originalProfileId = String(parent?.profile_id ?? "").trim();
  if (!originalProfileId) return { ok: false, message: "Parent account profile was not found" };

  let profileId = originalProfileId;
  if (isSupabaseAdminConfigured()) {
    const admin = createSupabaseAdminClient();
    const existingAuthId = await authUserIdForEmail(admin, email);
    if (existingAuthId && existingAuthId !== originalProfileId) {
      profileId = existingAuthId;
    } else {
      const { error: updateAuthError } = await admin.auth.admin.updateUserById(originalProfileId, {
        email,
        email_confirm: true,
        user_metadata: { full_name: displayName },
      });
      if (updateAuthError) {
        const fallbackAuthId = await authUserIdForEmail(admin, email);
        if (fallbackAuthId) {
          profileId = fallbackAuthId;
        } else {
          const { data: created, error: createAuthError } = await admin.auth.admin.createUser({
            email,
            password: temporaryAccountPassword(),
            email_confirm: true,
            user_metadata: { full_name: displayName },
          });
          if (createAuthError || !created.user?.id) {
            return { ok: false, message: createAuthError?.message ?? updateAuthError.message };
          }
          profileId = created.user.id;
        }
      }
    }
  }

  const { error: profileError } = await access.client.from("profiles").upsert(
    {
      id: profileId,
      role: "parent",
      display_name: displayName,
      email,
    },
    { onConflict: "id" },
  );
  if (profileError) return { ok: false, message: profileError.message };

  if (profileId !== originalProfileId) {
    const { error: relinkError } = await access.client
      .from("parents")
      .update({ profile_id: profileId })
      .eq("id", parentId);
    if (relinkError) return { ok: false, message: relinkError.message };
  }

  const mapped = await fetchMappedParent(access.client, parentId);
  if (!mapped.ok) return mapped;
  await writeAuditEvent(access.auditClient, {
    action: "parent.update",
    entityType: "parent",
    entityId: parentId,
    metadata: { name: displayName, email },
  });
  return mapped;
}

export async function serverSetParentStudentLinks(input: {
  parentId: string;
  studentIds: string[];
}): Promise<WriteOk<ParentSummary> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const parentId = input.parentId.trim();
  const studentIds = [...new Set(input.studentIds.map((id) => id.trim()).filter(Boolean))];
  if (!parentId) return { ok: false, message: "Missing parent id" };

  const access = await mutationClientForParentContactUpdate();
  if (!access.ok) return access;

  const { data: parent, error: parentError } = await access.client
    .from("parents")
    .select("id, profiles ( display_name )")
    .eq("id", parentId)
    .maybeSingle();
  if (parentError) return { ok: false, message: parentError.message };
  if (!parent) return { ok: false, message: "Parent not found" };

  if (studentIds.length > 0) {
    const { data: students, error: studentsError } = await access.client
      .from("students")
      .select("id")
      .in("id", studentIds);
    if (studentsError) return { ok: false, message: studentsError.message };
    const found = new Set((students ?? []).map((row) => String(row.id)));
    const missing = studentIds.filter((id) => !found.has(id));
    if (missing.length > 0) return { ok: false, message: "One or more selected students was not found" };
  }

  const { error: clearError } = await access.client
    .from("parent_students")
    .delete()
    .eq("parent_id", parentId);
  if (clearError) return { ok: false, message: clearError.message };

  if (studentIds.length > 0) {
    const { error: linkError } = await access.client
      .from("parent_students")
      .insert(studentIds.map((studentId) => ({ parent_id: parentId, student_id: studentId })));
    if (linkError) return { ok: false, message: linkError.message };
  }

  const mapped = await fetchMappedParent(access.client, parentId);
  if (!mapped.ok) return mapped;
  await writeAuditEvent(access.auditClient, {
    action: "parent_students.replace",
    entityType: "parent",
    entityId: parentId,
    metadata: { studentIds },
  });
  return mapped;
}

export async function serverCreateParentInviteLink(input: {
  parentId: string;
  origin: string;
}): Promise<{ ok: true; inviteUrl: string; parent: ParentSummary } | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  if (!isSupabaseAdminConfigured()) return { ok: false, message: "Account setup is temporarily unavailable." };
  const parentId = input.parentId.trim();
  if (!parentId) return { ok: false, message: "Missing parent id" };

  const access = await mutationClientForParentContactUpdate();
  if (!access.ok) return access;
  const parent = await fetchMappedParent(access.client, parentId);
  if (!parent.ok) return parent;
  const email = cleanContactEmail(parent.row.email);
  if (!isValidContactEmail(email)) return { ok: false, message: "Parent needs a valid email before inviting" };
  const ensured = await ensureParentAccountForEmail(access.client, {
    displayName: parent.row.name,
    email,
  });
  if (!ensured.ok) return ensured;

  const admin = createSupabaseAdminClient();
  const redirectTo = `${input.origin.replace(/\/$/, "")}/reset-password`;
  const link = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo,
    },
  });
  if (link.error || !link.data.properties?.action_link) {
    return { ok: false, message: link.error?.message ?? "Could not create invite link" };
  }

  await writeAuditEvent(access.auditClient, {
    action: "parent.invite_link.create",
    entityType: "parent",
    entityId: parentId,
    metadata: { email },
  });
  return { ok: true, inviteUrl: link.data.properties.action_link, parent: parent.row };
}

export async function serverDeleteParent(parentId: string): Promise<{ ok: true } | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const id = parentId.trim();
  if (!id) return { ok: false, message: "Missing parent id" };

  const access = await mutationClientForParentContactUpdate();
  if (!access.ok) return access;
  if (!access.actorId || !(await currentUserIsAdmin(access.auditClient, access.actorId))) {
    return { ok: false, message: "Only administrators can delete parent records." };
  }

  const { data: parent, error: parentError } = await access.client
    .from("parents")
    .select("id, profile_id, profiles ( display_name, email, role )")
    .eq("id", id)
    .maybeSingle();
  if (parentError) return { ok: false, message: parentError.message };
  if (!parent) return { ok: false, message: "Parent not found" };

  const profile = firstRel<Record<string, unknown>>((parent as { profiles?: unknown }).profiles);
  const profileId = String((parent as { profile_id?: unknown }).profile_id ?? "").trim();
  const email = String(profile?.email ?? "").trim();
  const name = String(profile?.display_name ?? "").trim();
  const role = String(profile?.role ?? "").trim();

  const { error: linkDeleteError } = await access.client
    .from("parent_students")
    .delete()
    .eq("parent_id", id);
  if (linkDeleteError) return { ok: false, message: linkDeleteError.message };

  const { error: parentDeleteError } = await access.client
    .from("parents")
    .delete()
    .eq("id", id);
  if (parentDeleteError) return { ok: false, message: parentDeleteError.message };

  if (profileId && role === "parent" && isSupabaseAdminConfigured()) {
    const { error: authDeleteError } = await createSupabaseAdminClient().auth.admin.deleteUser(profileId);
    if (authDeleteError) return { ok: false, message: `Parent record was deleted, but auth cleanup failed: ${authDeleteError.message}` };
  } else if (profileId && role === "parent") {
    const { error: profileDeleteError } = await access.client
      .from("profiles")
      .delete()
      .eq("id", profileId);
    if (profileDeleteError) return { ok: false, message: `Parent record was deleted, but profile cleanup failed: ${profileDeleteError.message}` };
  }

  await writeAuditEvent(access.auditClient, {
    action: "parent.delete",
    entityType: "parent",
    entityId: id,
    metadata: { name, email, profileId },
  });
  return { ok: true };
}

export async function serverDeleteStudent(id: string): Promise<{ ok: true } | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) return { ok: false, message: error.message };
    await writeAuditEvent(supabase, {
      action: "student.delete",
      entityType: "student",
      entityId: id,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function serverUpdateStudent(
  id: string,
  input: {
    name?: string;
    level?: string;
    parent?: string;
    parentEmail?: string;
  },
): Promise<WriteOk<StudentListItem> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const studentId = id.trim();
  if (!studentId) return { ok: false, message: "Missing student id" };

  try {
    const resolved = await mutationClientForParentContactUpdate();
    if (!resolved.ok) return resolved;
    const { client, auditClient } = resolved;
    const payload: Record<string, unknown> = {};
    if (input.name != null) payload.display_name = input.name.trim();
    if (input.level != null) payload.level = input.level.trim();
    if (input.parent != null) payload.guardian_label = input.parent.trim() || null;

    const wantsParentEmailUpdate = input.parentEmail !== undefined;
    const parentEmail = cleanContactEmail(input.parentEmail);
    if (wantsParentEmailUpdate && !isValidContactEmail(parentEmail)) {
      return { ok: false, message: "Enter a valid parent email address" };
    }

    if (Object.keys(payload).length === 0 && !wantsParentEmailUpdate) {
      return { ok: false, message: "No fields to update" };
    }

    let currentGuardian = input.parent?.trim() ?? "";
    if (wantsParentEmailUpdate && !currentGuardian) {
      const { data: currentStudent, error: currentError } = await client
        .from("students")
        .select("guardian_label, display_name")
        .eq("id", studentId)
        .maybeSingle();
      if (currentError) return { ok: false, message: currentError.message };
      currentGuardian = String(currentStudent?.guardian_label ?? currentStudent?.display_name ?? "Parent").trim();
    }

    if (Object.keys(payload).length > 0) {
      const { data, error } = await client
        .from("students")
        .update(payload)
        .eq("id", studentId)
        .select("id")
        .maybeSingle();
      if (error) return { ok: false, message: error.message };
      if (!data) return { ok: false, message: "No row updated" };
    }

    if (wantsParentEmailUpdate) {
      const parent = await ensureParentAccountForEmail(client, {
        displayName: currentGuardian || "Parent",
        email: parentEmail,
      });
      if (!parent.ok) return parent;

      const { error: clearError } = await client
        .from("parent_students")
        .delete()
        .eq("student_id", studentId);
      if (clearError) return { ok: false, message: clearError.message };

      const { error: linkError } = await client.from("parent_students").insert({
        parent_id: parent.parentId,
        student_id: studentId,
      });
      if (linkError) return { ok: false, message: linkError.message };
    }

    const mapped = await fetchMappedStudent(client, studentId);
    if (!mapped.ok) return mapped;

    await writeAuditEvent(auditClient, {
      action: "student.update",
      entityType: "student",
      entityId: mapped.row.id,
      metadata: {
        fields: [
          ...Object.keys(payload),
          ...(wantsParentEmailUpdate ? ["parentEmail"] : []),
        ],
      },
    });
    return mapped;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function serverPatchEnrollmentStatus(input: {
  classId: string;
  studentId: string;
  status: ClassRosterStatus;
}): Promise<{ ok: true } | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const classId = input.classId.trim();
  const studentId = input.studentId.trim();
  if (!classId || !studentId) return { ok: false, message: "Missing class or student id" };
  if (input.status === "Pending") {
    return { ok: false, message: "Pending class workflow must be created as a class request, not an enrollment" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const dbStatus = workflowStatusForRoster(input.status);
    if (dbStatus === "approved") {
      const { data: existingEnrollment, error: existingEnrollmentError } = await supabase
        .from("enrollments")
        .select("status")
        .eq("class_id", classId)
        .eq("student_id", studentId)
        .maybeSingle();
      if (existingEnrollmentError) return { ok: false, message: existingEnrollmentError.message };
      const allowed = await ensureApprovedRosterPlacementAllowed(supabase, {
        classId,
        studentId,
        existingApprovedInClass: String(existingEnrollment?.status ?? "").toLowerCase() === "approved",
      });
      if (!allowed.ok) return allowed;
    }
    const { error } = await supabase
      .from("enrollments")
      .update({ status: dbStatus })
      .eq("class_id", classId)
      .eq("student_id", studentId);
    if (error) return { ok: false, message: error.message };
    if (dbStatus === "approved") {
      const cleaned = await clearSameSlotAlternativesAfterApproval(supabase, {
        studentId,
        approvedClassId: classId,
      });
      if (!cleaned.ok) return cleaned;
    }
    await writeAuditEvent(supabase, {
      action: "enrollment.status.update",
      entityType: "enrollment",
      entityId: `${classId}:${studentId}`,
      metadata: { classId, studentId, status: dbStatus },
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function serverDeleteEnrollment(input: {
  classId: string;
  studentId: string;
}): Promise<{ ok: true } | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const classId = input.classId.trim();
  const studentId = input.studentId.trim();
  if (!classId || !studentId) return { ok: false, message: "Missing class or student id" };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("enrollments")
      .delete()
      .eq("class_id", classId)
      .eq("student_id", studentId);
    if (error) return { ok: false, message: error.message };
    await writeAuditEvent(supabase, {
      action: "enrollment.delete",
      entityType: "enrollment",
      entityId: `${classId}:${studentId}`,
      metadata: { classId, studentId },
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function serverInsertRosterStudent(input: {
  classId: string;
  studentId?: string;
  name: string;
  parent: string;
  age?: number;
  level: string;
  status: ClassRosterStatus;
  description?: string;
}): Promise<WriteOk<ClassRosterStudent> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const classId = input.classId.trim();
  const existingStudentId = input.studentId?.trim() ?? "";
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!classId || (!name && !existingStudentId)) return { ok: false, message: "Missing class or student" };
  if (input.status === "Pending") {
    return { ok: false, message: "Pending class workflow must be created as a class request, not an enrollment" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: classRow, error: classError } = await supabase
      .from("classes")
      .select("id, program, block, schedule_summary")
      .eq("id", classId)
      .maybeSingle();
    if (classError) return { ok: false, message: classError.message };
    if (!classRow) return { ok: false, message: "Class not found" };

    let createdStudent = false;
    let student: {
      id?: unknown;
      display_name?: unknown;
      guardian_label?: unknown;
      age_years?: unknown;
      level?: unknown;
      support_notes?: unknown;
    } | null = null;

    if (existingStudentId) {
      const { data: existingEnrollment, error: existingEnrollmentError } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("class_id", classId)
        .eq("student_id", existingStudentId)
        .maybeSingle();
      if (existingEnrollmentError) return { ok: false, message: existingEnrollmentError.message };
      if (existingEnrollment) return { ok: false, message: "Student is already on this class roster." };

      const { data, error } = await supabase
        .from("students")
        .select(`id, display_name, guardian_label, age_years, level, support_notes, ${STUDENT_PARENT_CONTACT_SELECT}`)
        .eq("id", existingStudentId)
        .maybeSingle();
      if (error) return { ok: false, message: error.message };
      if (!data?.id) return { ok: false, message: "Student not found" };
      student = data;
    } else {
      const age = Number.isFinite(input.age) && Number(input.age) >= 0 ? Math.round(Number(input.age)) : null;
      const { data, error } = await supabase
        .from("students")
        .insert({
          display_name: name,
          guardian_label: input.parent.trim() || null,
          age_years: age,
          level: input.level.trim() || null,
          track: classRow.program === "enrichment" ? "enrichment" : "core",
          support_notes: input.description?.trim() ?? "",
        })
        .select(`id, display_name, guardian_label, age_years, level, support_notes, ${STUDENT_PARENT_CONTACT_SELECT}`)
        .maybeSingle();
      if (error) return { ok: false, message: error.message };
      if (!data?.id) return { ok: false, message: "Student could not be created" };
      student = data;
      createdStudent = true;
    }

    const dbStatus = workflowStatusForRoster(input.status);
    if (dbStatus === "approved") {
      const allowed = await ensureApprovedRosterPlacementAllowed(supabase, {
        classId,
        studentId: String(student.id),
      });
      if (!allowed.ok) return allowed;
    }
    const { error: enrollmentError } = await supabase.from("enrollments").insert({
      class_id: classId,
      student_id: student.id,
      status: dbStatus,
    });
    if (enrollmentError) return { ok: false, message: enrollmentError.message };
    if (dbStatus === "approved") {
      const cleaned = await clearSameSlotAlternativesAfterApproval(supabase, {
        studentId: String(student.id),
        approvedClassId: classId,
      });
      if (!cleaned.ok) return cleaned;
    }

    const row: ClassRosterStudent = {
      id: String(student.id),
      name: String(student.display_name ?? name),
      parent: parentContactFromStudentRow(student as Record<string, unknown>).name || "—",
      age: Number(student.age_years ?? 0) || 0,
      level: String(student.level ?? ""),
      status: input.status,
      description: String(student.support_notes ?? input.description ?? ""),
    };
    await writeAuditEvent(supabase, {
      action: "enrollment.create",
      entityType: "enrollment",
      entityId: `${classId}:${row.id}`,
      metadata: { classId, studentId: row.id, status: dbStatus, createdStudent },
    });
    return { ok: true, row };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function serverUpdateRosterStudent(input: {
  classId: string;
  studentId: string;
  name?: string;
  parent?: string;
  age?: number;
  level?: string;
  status?: ClassRosterStatus;
  description?: string;
}): Promise<WriteOk<ClassRosterStudent> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const classId = input.classId.trim();
  const studentId = input.studentId.trim();
  if (!classId || !studentId) return { ok: false, message: "Missing class or student id" };
  if (input.status === "Pending") {
    return { ok: false, message: "Pending class workflow must be created as a class request, not an enrollment" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const studentPayload: Record<string, unknown> = {};
    if (input.name != null) studentPayload.display_name = input.name.trim().replace(/\s+/g, " ");
    if (input.parent != null) studentPayload.guardian_label = input.parent.trim() || null;
    if (input.age != null) {
      studentPayload.age_years =
        Number.isFinite(input.age) && Number(input.age) >= 0 ? Math.round(Number(input.age)) : null;
    }
    if (input.level != null) studentPayload.level = input.level.trim() || null;
    if (input.description != null) studentPayload.support_notes = input.description.trim();

    let studentRow: Record<string, unknown> | null = null;
    if (Object.keys(studentPayload).length > 0) {
      const { data, error } = await supabase
        .from("students")
        .update(studentPayload)
        .eq("id", studentId)
        .select(`id, display_name, guardian_label, age_years, level, support_notes, ${STUDENT_PARENT_CONTACT_SELECT}`)
        .maybeSingle();
      if (error) return { ok: false, message: error.message };
      if (!data) return { ok: false, message: "No student row updated" };
      studentRow = data as unknown as Record<string, unknown>;
    } else {
      const { data, error } = await supabase
        .from("students")
        .select(`id, display_name, guardian_label, age_years, level, support_notes, ${STUDENT_PARENT_CONTACT_SELECT}`)
        .eq("id", studentId)
        .maybeSingle();
      if (error) return { ok: false, message: error.message };
      if (!data) return { ok: false, message: "Student not found" };
      studentRow = data as unknown as Record<string, unknown>;
    }

    let status: ClassRosterStatus = input.status ?? "Pending";
    const dbStatus = workflowStatusForRoster(status);
    if (input.status != null) {
      if (dbStatus === "approved") {
        const { data: existingEnrollment, error: existingEnrollmentError } = await supabase
          .from("enrollments")
          .select("status")
          .eq("class_id", classId)
          .eq("student_id", studentId)
          .maybeSingle();
        if (existingEnrollmentError) return { ok: false, message: existingEnrollmentError.message };
        const allowed = await ensureApprovedRosterPlacementAllowed(supabase, {
          classId,
          studentId,
          existingApprovedInClass: String(existingEnrollment?.status ?? "").toLowerCase() === "approved",
        });
        if (!allowed.ok) return allowed;
      }
      const { error } = await supabase
        .from("enrollments")
        .update({ status: dbStatus })
        .eq("class_id", classId)
        .eq("student_id", studentId);
      if (error) return { ok: false, message: error.message };
    } else {
      const { data: existingEnrollment, error: existingEnrollmentError } = await supabase
        .from("enrollments")
        .select("status")
        .eq("class_id", classId)
        .eq("student_id", studentId)
        .maybeSingle();
      if (existingEnrollmentError) return { ok: false, message: existingEnrollmentError.message };
      status = rosterStatusFromDb((existingEnrollment as Record<string, unknown> | null)?.status);
    }

    const row: ClassRosterStudent = {
      id: String(studentRow.id ?? studentId),
      name: String(studentRow.display_name ?? input.name ?? ""),
      parent: parentContactFromStudentRow(studentRow, { name: input.parent }).name || "—",
      age: Number(studentRow.age_years ?? input.age ?? 0) || 0,
      level: String(studentRow.level ?? input.level ?? ""),
      status,
      description: String(studentRow.support_notes ?? input.description ?? ""),
    };
    await writeAuditEvent(supabase, {
      action: "enrollment.student.update",
      entityType: "enrollment",
      entityId: `${classId}:${studentId}`,
      metadata: { classId, studentId, fields: Object.keys(studentPayload), status: input.status ?? null },
    });
    return { ok: true, row };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

const teacherListSelect =
  "id, profile_id, subjects, phone, program, profiles ( display_name, email )";

export async function serverInsertTeacher(input: {
  name: string;
  subjects: string;
  email: string;
  phone?: string;
  program: "core" | "enrichment";
}): Promise<WriteOk<TeacherRow> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const email = input.email.trim();
  if (!email) return { ok: false, message: "Teacher email is required" };
  try {
    const supabase = await createSupabaseServerClient();
    const { data: profile, error: pe } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (pe) return { ok: false, message: pe.message };
    if (!profile?.id) {
      return {
        ok: false,
        message:
          "No auth profile exists for that email. Sign up the user first, then add them as a teacher.",
      };
    }
    const { data, error } = await supabase
      .from("teachers")
      .insert({
        profile_id: profile.id,
        subjects: input.subjects.trim(),
        phone: (input.phone ?? "").trim(),
        program: input.program,
      })
      .select(teacherListSelect)
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "No row returned" };
    const { data: assignedClasses, error: classError } = await supabase
      .from("classes")
      .select("id, teacher_id, name, program")
      .eq("teacher_id", String(data.id));
    if (classError) return { ok: false, message: classError.message };
    const mapped = mapTeacherRow({
      ...(data as unknown as Record<string, unknown>),
      classes: assignedClasses ?? [],
    });
    if (!mapped) return { ok: false, message: "Could not map saved teacher" };
    if (input.name.trim()) {
      await supabase
        .from("profiles")
        .update({ display_name: input.name.trim() })
        .eq("id", profile.id);
      mapped.name = input.name.trim();
    }
    await writeAuditEvent(supabase, {
      action: "teacher.create",
      entityType: "teacher",
      entityId: mapped.id,
      metadata: { name: mapped.name, program: mapped.program },
    });
    return { ok: true, row: mapped };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function serverUpdateTeacher(
  id: string,
  input: {
    name: string;
    subjects: string;
    email: string;
    phone: string;
    program: "core" | "enrichment";
  },
): Promise<WriteOk<TeacherRow> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  try {
    const supabase = await createSupabaseServerClient();
    const payload = {
      subjects: input.subjects.trim(),
      phone: input.phone.trim(),
      program: input.program,
    };
    const { data, error } = await supabase
      .from("teachers")
      .update(payload)
      .eq("id", id)
      .select(teacherListSelect)
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "No row updated" };
    const row = data as { profile_id?: string };
    if (input.name.trim() && row.profile_id) {
      await supabase
        .from("profiles")
        .update({ display_name: input.name.trim() })
        .eq("id", row.profile_id);
    }
    const { data: assignedClasses, error: classError } = await supabase
      .from("classes")
      .select("id, teacher_id, name, program")
      .eq("teacher_id", id);
    if (classError) return { ok: false, message: classError.message };
    const mapped = mapTeacherRow({
      ...(data as unknown as Record<string, unknown>),
      classes: assignedClasses ?? [],
    });
    if (!mapped) return { ok: false, message: "Could not map saved teacher" };
    if (input.name.trim()) mapped.name = input.name.trim();
    mapped.email = input.email.trim();
    await writeAuditEvent(supabase, {
      action: "teacher.update",
      entityType: "teacher",
      entityId: mapped.id,
      metadata: { name: mapped.name, program: mapped.program },
    });
    return { ok: true, row: mapped };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function serverDeleteTeacher(id: string): Promise<{ ok: true } | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("teachers").delete().eq("id", id);
    if (error) return { ok: false, message: error.message };
    await writeAuditEvent(supabase, {
      action: "teacher.delete",
      entityType: "teacher",
      entityId: id,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

const requestSelect = `
  id,
  student_id,
  class_id,
  requested_by_profile_id,
  status,
  block,
  level,
  option_label,
  created_at,
  students ( display_name, guardian_label, ${STUDENT_PARENT_CONTACT_SELECT} ),
  classes ( id, name, program, block, schedule_summary ),
  requester:profiles!class_requests_requested_by_profile_id_fkey ( display_name, email )
`;

type FinalRequestDecisionStatus = "approved" | "waitlisted" | "rejected";

const finalPlacementSelect = `
  id,
  student_id,
  class_id,
  status,
  created_at,
  students ( display_name, guardian_label, ${STUDENT_PARENT_CONTACT_SELECT} ),
  classes ( id, name, program, block, level, schedule_summary )
`;

function finalStatusLabel(status: FinalRequestDecisionStatus): Exclude<EnrichmentRequestRow["status"], "Pending"> {
  if (status === "approved") return "Approved";
  if (status === "waitlisted") return "Waitlisted";
  return "Rejected";
}

function mapFinalPlacementRequestRow(row: Record<string, unknown>): EnrichmentRequestRow | null {
  const id = String(row.id ?? "").trim();
  const studentId = String(row.student_id ?? "").trim();
  const classId = String(row.class_id ?? "").trim();
  if (!id || !studentId || !classId) return null;

  const students = Array.isArray(row.students) ? row.students[0] : row.students;
  const classes = Array.isArray(row.classes) ? row.classes[0] : row.classes;
  const student = students && typeof students === "object" ? students as Record<string, unknown> : {};
  const cls = classes && typeof classes === "object" ? classes as Record<string, unknown> : {};
  const dbStatus = String(row.status ?? "").toLowerCase();
  const status =
    dbStatus === "approved" || dbStatus === "waitlisted" || dbStatus === "rejected"
      ? finalStatusLabel(dbStatus)
      : "Rejected";

  return {
    id: `enrollment:${id}`,
    studentId,
    classId,
    student: String(student.display_name ?? student.student_name ?? ""),
    parent: parentContactFromStudentRow(student).name,
    class: String(cls.name ?? cls.class_name ?? ""),
    block: String(cls.block ?? ""),
    level: String(cls.level ?? ""),
    option: "Final placement",
    status,
  };
}

async function latestDecisionMetadata(
  supabase: SupabaseMutationClient,
  input: { studentId: string; classId: string },
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("class_request_decisions")
    .select("requested_by_profile_id, block, level, option_label, requested_at")
    .eq("student_id", input.studentId)
    .eq("class_id", input.classId)
    .order("decided_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as Record<string, unknown>;
}

async function selectFinalPlacement(
  supabase: SupabaseMutationClient,
  id: string,
): Promise<{ ok: true; raw: Record<string, unknown> } | WriteFail> {
  const finalId = id.replace(/^enrollment:/, "").trim();
  if (!finalId) return { ok: false, message: "Missing final placement id" };
  const { data, error } = await supabase
    .from("enrollments")
    .select(finalPlacementSelect)
    .eq("id", finalId)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "Final placement not found" };
  return { ok: true, raw: data as unknown as Record<string, unknown> };
}

async function reopenFinalPlacementAsRequest(
  supabase: SupabaseMutationClient,
  raw: Record<string, unknown>,
): Promise<WriteOk<EnrichmentRequestRow> | WriteFail> {
  const enrollmentId = String(raw.id ?? "").trim();
  const studentId = String(raw.student_id ?? "").trim();
  const classId = String(raw.class_id ?? "").trim();
  if (!enrollmentId || !studentId || !classId) return { ok: false, message: "Final placement is missing student or class id" };

  const decision = await latestDecisionMetadata(supabase, { studentId, classId });
  const requesterProfileId =
    String(decision?.requested_by_profile_id ?? "").trim() ||
    (await resolveClassRequestRequesterProfileId(supabase, studentId));
  if (!requesterProfileId) return { ok: false, message: "Could not resolve a requester profile for the reopened request" };

  const classes = Array.isArray(raw.classes) ? raw.classes[0] : raw.classes;
  const cls = classes && typeof classes === "object" ? classes as Record<string, unknown> : {};
  const choice = {
    classId,
    block: String(decision?.block ?? cls.block ?? "").trim(),
    level: String(decision?.level ?? cls.level ?? "").trim(),
    option: String(decision?.option_label ?? "admin-reopened").trim(),
  };

  const { error: existingRequestDeleteError } = await supabase
    .from("class_requests")
    .delete()
    .eq("student_id", studentId)
    .eq("class_id", classId);
  if (existingRequestDeleteError) return { ok: false, message: existingRequestDeleteError.message };

  const inserted = await insertEnrichmentRequestRows(supabase, {
    studentId,
    requestedByProfileId: requesterProfileId,
    choices: [choice],
  });
  if (!inserted.ok) return inserted;

  const { error: enrollmentDeleteError } = await supabase
    .from("enrollments")
    .delete()
    .eq("id", enrollmentId);
  if (enrollmentDeleteError) return { ok: false, message: enrollmentDeleteError.message };

  const row = inserted.rows[0];
  if (!row) return { ok: false, message: "Reopened request row was not returned" };
  return { ok: true, row };
}

async function insertClassRequestDecisionLog(
  supabase: SupabaseMutationClient,
  raw: Record<string, unknown>,
  input: {
    status: FinalRequestDecisionStatus;
    decidedByProfileId?: string | null;
    reason?: string | null;
  },
): Promise<WriteFail | { ok: true }> {
  const studentId = String(raw.student_id ?? "").trim();
  const classId = String(raw.class_id ?? "").trim();
  if (!studentId || !classId) {
    return { ok: false, message: "Decision log is missing student or class id" };
  }

  const originalRequestId = String(raw.id ?? "").trim();
  const requestedByProfileId = String(raw.requested_by_profile_id ?? "").trim();
  const decidedByProfileId = String(input.decidedByProfileId ?? "").trim();
  const block = String(raw.block ?? "").trim();
  const level = String(raw.level ?? "").trim();
  const optionLabel = String(raw.option_label ?? "").trim();
  const requestedAt = String(raw.created_at ?? "").trim();
  const reason = String(input.reason ?? "").trim();

  const { error } = await supabase
    .from("class_request_decisions")
    .insert({
      original_request_id: originalRequestId || null,
      student_id: studentId,
      class_id: classId,
      requested_by_profile_id: requestedByProfileId || null,
      decided_by_profile_id: decidedByProfileId || null,
      status: input.status,
      block: block || null,
      level: level || null,
      option_label: optionLabel || null,
      reason: reason || null,
      requested_at: requestedAt || null,
    });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

async function resolveRequestStudentId(
  supabase: SupabaseMutationClient,
  requestedByProfileId: string,
  explicitStudentId?: string,
): Promise<string | null> {
  const trimmed = explicitStudentId?.trim();
  if (trimmed) return trimmed;

  const { data: parentRow } = await supabase
    .from("parents")
    .select("parent_students ( student_id )")
    .eq("profile_id", requestedByProfileId)
    .limit(1)
    .maybeSingle();

  const joins = Array.isArray(parentRow?.parent_students)
    ? parentRow.parent_students
    : [];
  const firstStudentId =
    joins[0] && typeof joins[0] === "object" && "student_id" in joins[0]
      ? String((joins[0] as { student_id: unknown }).student_id)
      : "";
  if (firstStudentId) return firstStudentId;

  const { data: firstStudent } = await supabase
    .from("students")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return firstStudent?.id ? String(firstStudent.id) : null;
}

async function resolveClassRequestRequesterProfileId(
  supabase: SupabaseMutationClient,
  studentId: string,
): Promise<string | null> {
  const { data: joins, error } = await supabase
    .from("parent_students")
    .select("parents ( profile_id )")
    .eq("student_id", studentId)
    .limit(1);

  if (!error) {
    const firstJoin = Array.isArray(joins) ? joins[0] : null;
    const parents = firstJoin && typeof firstJoin === "object" && "parents" in firstJoin
      ? (firstJoin as { parents?: unknown }).parents
      : null;
    const parent = Array.isArray(parents) ? parents[0] : parents;
    if (parent && typeof parent === "object" && "profile_id" in parent) {
      const profileId = String((parent as { profile_id?: unknown }).profile_id ?? "").trim();
      if (profileId) return profileId;
    }
  }

  const { data: student } = await supabase
    .from("students")
    .select("profile_id")
    .eq("id", studentId)
    .maybeSingle();
  const studentProfileId = String(student?.profile_id ?? "").trim();
  if (studentProfileId) return studentProfileId;

  const { data: parentRow } = await supabase
    .from("parents")
    .select("profile_id")
    .limit(1)
    .maybeSingle();
  const parentProfileId = String(parentRow?.profile_id ?? "").trim();
  if (parentProfileId) return parentProfileId;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["parent", "admin"])
    .limit(1)
    .maybeSingle();
  return profile?.id ? String(profile.id) : null;
}

async function ensureStudentExists(
  supabase: SupabaseMutationClient,
  studentId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();
  return Boolean(!error && data);
}

async function insertEnrichmentRequestRows(
  supabase: SupabaseMutationClient,
  input: {
    studentId: string;
    requestedByProfileId: string;
    choices: {
      classId: string;
      block: string;
      level: string;
      option: string;
      waitlist?: boolean;
    }[];
  },
): Promise<{ ok: true; rows: EnrichmentRequestRow[] } | WriteFail> {
  const payload = input.choices.map((choice) => ({
    student_id: input.studentId,
    class_id: choice.classId,
    requested_by_profile_id: input.requestedByProfileId,
    status: "pending" as const,
    block: choice.block || null,
    level: choice.level || null,
    option_label: requestOptionLabel(choice),
  }));

  const { data, error } = await supabase
    .from("class_requests")
    .insert(payload)
    .select(requestSelect);
  if (error) return { ok: false, message: error.message };

  const rows = (data ?? [])
    .map((row) => mapRequestRow(row as unknown as Record<string, unknown>))
    .filter((x): x is EnrichmentRequestRow => x !== null);
  if (rows.length === 0) return { ok: false, message: "No request rows returned" };
  return { ok: true, rows };
}

async function ensureClassCapacityForChoices(
  supabase: SupabaseMutationClient,
  choices: {
    classId: string;
    waitlist?: boolean;
  }[],
  options: { semesterId: string | null; studentId: string },
): Promise<WriteFail | { ok: true }> {
  const requestedByClass = choices.reduce<Map<string, number>>((next, choice) => {
    if (choice.waitlist) return next;
    next.set(choice.classId, (next.get(choice.classId) ?? 0) + 1);
    return next;
  }, new Map());
  const classIds = [...new Set(choices.map((choice) => choice.classId))];
  if (classIds.length === 0) return { ok: true };

  const { data: availability, error: availabilityError } = await supabase
    .from("class_catalog_availability")
    .select("class_id, seats_remaining, availability_label")
    .in("class_id", classIds);
  if (availabilityError) return { ok: false, message: availabilityError.message };

  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name, semester_id, program, is_active, archived_at, min_age_years, max_age_years")
    .in("id", classIds);
  if (classesError) return { ok: false, message: classesError.message };

  const classRows = (classes ?? []) as unknown as Record<string, unknown>[];
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, age_years")
    .eq("id", options.studentId)
    .maybeSingle();
  if (studentError) return { ok: false, message: studentError.message };
  if (!student) return { ok: false, message: "Selected student was not found" };
  const rawAge = (student as Record<string, unknown>).age_years;
  const studentAge = rawAge != null ? Number(rawAge) : null;
  const availabilityByClassId = new Map(
    ((availability ?? []) as unknown as Record<string, unknown>[]).map((row) => [String(row.class_id), row]),
  );
  const classNamesById = new Map(
    classRows.map((row) => [String(row.id), String(row.name ?? "Selected class")]),
  );
  for (const classId of classIds) {
    const row = availabilityByClassId.get(classId);
    if (!row || !classNamesById.has(classId)) return { ok: false, message: "Selected class was not found" };
    const classRow = classRows.find((candidate) => String(candidate.id) === classId);
    if (!classBelongsToSemester(classRow, options.semesterId)) {
      return { ok: false, message: "Selected class is not available in the current semester." };
    }
    if (String(classRow?.program ?? "").toLowerCase() !== "enrichment") {
      return { ok: false, message: "Only enrichment classes can be requested by parents." };
    }
    if (classRow && "is_active" in classRow && !Boolean(classRow.is_active)) {
      return { ok: false, message: `${classNamesById.get(classId) ?? "Selected class"} is not currently available.` };
    }
    if (classRow && "archived_at" in classRow && classRow.archived_at) {
      return { ok: false, message: `${classNamesById.get(classId) ?? "Selected class"} has been archived.` };
    }
    const minAge = optionalClassAgeLimit(classRow?.min_age_years);
    const maxAge = optionalClassAgeLimit(classRow?.max_age_years);
    if (studentAge !== null && minAge !== null) {
      if (studentAge < minAge) {
        return { ok: false, message: `${classNamesById.get(classId) ?? "Selected class"} requires students to be at least ${minAge}.` };
      }
    }
    if (studentAge !== null && maxAge !== null) {
      if (studentAge > maxAge) {
        return { ok: false, message: `${classNamesById.get(classId) ?? "Selected class"} is limited to students age ${maxAge} or younger.` };
      }
    }

    const remaining = Math.max(0, Math.floor(Number(row.seats_remaining ?? 0)));
    const requested = requestedByClass.get(classId) ?? 0;
    const waitlistRequested = choices.some((choice) => choice.classId === classId && choice.waitlist);
    if (waitlistRequested && remaining > 0) {
      const className = classNamesById.get(classId) ?? "Selected class";
      return {
        ok: false,
        message: `${className} still has available seats. Submit a regular class request instead of waitlist.`,
      };
    }
    if (requested > remaining) {
      const className = classNamesById.get(classId) ?? "Selected class";
      return {
        ok: false,
        message:
          remaining === 0
            ? `${className} is full while pending requests are held.`
            : `${className} only has ${remaining} seat${remaining === 1 ? "" : "s"} left.`,
      };
    }
  }

  return { ok: true };
}

async function ensureNoDuplicatePendingClassRequests(
  supabase: SupabaseMutationClient,
  input: {
    studentId: string;
    choices: { classId: string; waitlist?: boolean }[];
  },
): Promise<WriteFail | { ok: true }> {
  const classIds = [...new Set(input.choices.map((choice) => choice.classId).filter(Boolean))];
  if (classIds.length === 0) return { ok: true };

  const { data, error } = await supabase
    .from("class_requests")
    .select("class_id, classes ( name )")
    .eq("student_id", input.studentId)
    .eq("status", "pending")
    .in("class_id", classIds);
  if (error) return { ok: false, message: error.message };

  const existing = ((data ?? []) as unknown as Record<string, unknown>[])[0];
  if (!existing) return { ok: true };

  const classes = Array.isArray(existing.classes) ? existing.classes[0] : existing.classes;
  const cls = classes && typeof classes === "object" ? classes as Record<string, unknown> : {};
  const className = String(cls.name ?? "Selected class");
  return { ok: false, message: `${className} already has a pending request for this student.` };
}

async function ensureOpenSlotsForRequestChoices(
  supabase: SupabaseMutationClient,
  input: {
    studentId: string;
    choices: { classId: string; block: string; level: string }[];
    semesterId: string | null;
  },
): Promise<WriteFail | { ok: true }> {
  const classIds = [...new Set(input.choices.map((choice) => choice.classId).filter(Boolean))];
  if (classIds.length === 0) return { ok: true };

  const placementRows = await fetchRequestPlacementRows(supabase, {
    classIds,
    studentId: input.studentId,
  });
  if (!placementRows.ok) return placementRows;

  const requestedSlots = new Map(
    placementRows.requestedClasses
      .filter((row) => classBelongsToSemester(row as Record<string, unknown>, input.semesterId))
      .map((row) => [String(row.id ?? ""), classPlacementSlots(row)])
      .filter((entry): entry is [string, string[]] => Boolean(entry[0] && entry[1].length)),
  );
  const occupiedSlots = new Set<string>();
  for (const row of placementRows.enrollments) {
    if (String(row.status ?? "").toLowerCase() !== "approved") continue;
    const classRow = Array.isArray(row.classes) ? row.classes[0] : row.classes;
    if (!classBelongsToSemester((classRow ?? {}) as Record<string, unknown>, input.semesterId)) continue;
    for (const slot of classPlacementSlots((classRow ?? {}) as PlacementClassRow)) {
      occupiedSlots.add(slot);
    }
  }
  for (const row of placementRows.pendingRequests) {
    const classRow = Array.isArray(row.classes) ? row.classes[0] : row.classes;
    if (!classBelongsToSemester((classRow ?? {}) as Record<string, unknown>, input.semesterId)) continue;
    for (const slot of classPlacementSlots((classRow ?? {}) as PlacementClassRow)) {
      occupiedSlots.add(slot);
    }
  }

  for (const choice of input.choices) {
    const slots = requestedSlots.get(choice.classId) ?? [];
    if (slots.some((slot) => occupiedSlots.has(slot))) {
      return { ok: false, message: "This schedule slot already has an approved or pending class. Use waitlist instead of submitting another class request for the same block and day." };
    }
  }

  return { ok: true };
}

async function clearSameSlotAlternativesAfterApproval(
  supabase: SupabaseMutationClient,
  input: {
    studentId: string;
    approvedClassId: string;
    approvedRequestId?: string;
    decidedByProfileId?: string | null;
  },
): Promise<WriteFail | { ok: true }> {
  let { data: approvedClass, error: approvedClassError } = await supabase
    .from("classes")
    .select("id, program, block, level, schedule_summary, schedule_days, semester_id")
    .eq("id", input.approvedClassId)
    .maybeSingle();
  if (approvedClassError && isSemesterSchemaError(approvedClassError)) {
    const fallback = await supabase
      .from("classes")
      .select("id, program, block, level, schedule_summary, schedule_days")
      .eq("id", input.approvedClassId)
      .maybeSingle();
    approvedClass = fallback.data as typeof approvedClass;
    approvedClassError = fallback.error;
  }
  if (approvedClassError) return { ok: false, message: approvedClassError.message };
  if (!approvedClass) return { ok: false, message: "Approved class was not found" };

  const approved = approvedClass as PlacementClassRow;
  const semesterId = "semester_id" in ((approvedClass ?? {}) as Record<string, unknown>)
    ? String((approvedClass as Record<string, unknown>).semester_id ?? "")
    : null;
  const approvedSlots = classPlacementSlots(approved);
  let classQuery = supabase
    .from("classes")
    .select("id, program, block, level, schedule_summary, schedule_days");
  if (semesterId) {
    classQuery = classQuery.eq("semester_id", semesterId);
  }
  let { data: classRows, error: classesError } = await classQuery;
  if (classesError && semesterId && isSemesterSchemaError(classesError)) {
    const fallback = await supabase
      .from("classes")
      .select("id, program, block, level, schedule_summary, schedule_days")
      .not("id", "is", null);
    classRows = fallback.data as typeof classRows;
    classesError = fallback.error;
  }
  if (classesError) return { ok: false, message: classesError.message };

  const sameSlotClassIds = ((classRows ?? []) as PlacementClassRow[])
    .filter((row) => {
      if (!String(row.id ?? "")) return false;
      const rowSlots = classPlacementSlots(row);
      return rowSlots.some((slot) => approvedSlots.includes(slot));
    })
    .map((row) => String(row.id));
  if (sameSlotClassIds.length === 0) return { ok: true };

  const conflictingClassIds = sameSlotClassIds.filter((classId) => classId !== input.approvedClassId);
  if (conflictingClassIds.length > 0) {
    const { error: enrollmentDeleteError } = await supabase
      .from("enrollments")
      .delete()
      .eq("student_id", input.studentId)
      .in("class_id", conflictingClassIds);
    if (enrollmentDeleteError) return { ok: false, message: enrollmentDeleteError.message };
  }

  let conflictingRequestsQuery = supabase
    .from("class_requests")
    .select(requestSelect)
    .eq("student_id", input.studentId)
    .in("class_id", sameSlotClassIds);
  if (input.approvedRequestId) {
    conflictingRequestsQuery = conflictingRequestsQuery.neq("id", input.approvedRequestId);
  }

  const { data: conflictingRequests, error: conflictingRequestsError } = await conflictingRequestsQuery;
  if (conflictingRequestsError) return { ok: false, message: conflictingRequestsError.message };

  for (const row of (conflictingRequests ?? []) as unknown as Record<string, unknown>[]) {
    const logged = await insertClassRequestDecisionLog(supabase, row, {
      status: "rejected",
      decidedByProfileId: input.decidedByProfileId,
      reason: "Superseded by approved placement",
    });
    if (!logged.ok) return logged;
  }

  let requestDelete = supabase
    .from("class_requests")
    .delete()
    .eq("student_id", input.studentId)
    .in("class_id", sameSlotClassIds);
  if (input.approvedRequestId) {
    requestDelete = requestDelete.neq("id", input.approvedRequestId);
  }
  const { error: requestDeleteError } = await requestDelete;
  if (requestDeleteError) return { ok: false, message: requestDeleteError.message };

  return { ok: true };
}

function requestSlotKey(choice: { block: string; level: string }) {
  return `${choice.block}\u0000${choice.level}`;
}

function normalizeEnrichmentRequestChoices(
  choices: {
    classId: string;
    block: string;
    level: string;
    option: string;
    waitlist?: boolean;
  }[],
) {
  const bySlot = new Map<string, {
    first?: { classId: string; block: string; level: string; option: "1st"; waitlist?: boolean };
    second?: { classId: string; block: string; level: string; option: "2nd"; waitlist?: boolean };
  }>();

  for (const choice of choices) {
    const key = requestSlotKey(choice);
    const group = bySlot.get(key) ?? {};
    if (choice.option === "2nd") {
      group.second ??= { ...choice, option: "2nd" };
    } else {
      group.first ??= { ...choice, option: "1st" };
    }
    bySlot.set(key, group);
  }

  const normalized: { classId: string; block: string; level: string; option: "1st" | "2nd"; waitlist?: boolean }[] = [];
  bySlot.forEach((group) => {
    if (group.first) {
      normalized.push(group.first);
    }
    if (group.second && group.second.classId !== group.first?.classId) {
      normalized.push(group.second);
    }
  });

  return normalized;
}

type ClearedPendingEnrichmentRequestRow = {
  id: string;
  student_id: string;
  class_id: string;
  requested_by_profile_id?: string | null;
  created_at?: string | null;
  status?: string | null;
  block?: string | null;
  level?: string | null;
  option_label?: string | null;
};

async function clearPendingEnrichmentRequestChoices(
  supabase: SupabaseMutationClient,
  input: {
    studentId: string;
    semesterId: string | null;
    choices: {
      block: string;
      level: string;
      option: string;
      waitlist?: boolean;
    }[];
    submitScope?: "slot" | "choice";
  },
): Promise<WriteFail | { ok: true; rows: ClearedPendingEnrichmentRequestRow[] }> {
  const touchedSlots = new Set<string>();
  const clearedRows: ClearedPendingEnrichmentRequestRow[] = [];
  for (const choice of input.choices) {
    const slotKey = input.submitScope === "choice" ? `${requestSlotKey(choice)}\u0000${choice.option}` : requestSlotKey(choice);
    if (touchedSlots.has(slotKey)) continue;
    touchedSlots.add(slotKey);

    let query = supabase
      .from("class_requests")
      .select("id, student_id, class_id, requested_by_profile_id, created_at, status, block, level, option_label, classes ( semester_id )")
      .eq("student_id", input.studentId)
      .eq("status", "pending");

    query = choice.block ? query.eq("block", choice.block) : query.is("block", null);
    query = choice.level ? query.eq("level", choice.level) : query.is("level", null);
    if (input.submitScope === "choice") {
      query = query.in("option_label", [choice.option, waitlistOptionLabel(choice.option)]);
    }

    const { data: requestRows, error } = await query;
    if (error) return { ok: false, message: error.message };
    const rows = ((requestRows ?? []) as unknown as Record<string, unknown>[])
      .filter((row) => {
        if (!input.semesterId) return true;
        const cls = Array.isArray(row.classes) ? row.classes[0] : row.classes;
        return classBelongsToSemester((cls ?? {}) as Record<string, unknown>, input.semesterId);
      })
      .map((row) => ({
        id: String(row.id ?? "").trim(),
        student_id: String(row.student_id ?? "").trim(),
        class_id: String(row.class_id ?? "").trim(),
        requested_by_profile_id: row.requested_by_profile_id == null ? null : String(row.requested_by_profile_id),
        created_at: row.created_at == null ? null : String(row.created_at),
        status: row.status == null ? null : String(row.status),
        block: row.block == null ? null : String(row.block),
        level: row.level == null ? null : String(row.level),
        option_label: row.option_label == null ? null : String(row.option_label),
      }))
      .filter((row) => row.id && row.student_id && row.class_id);
    if (rows.length > 0) {
      const { error: deleteError } = await supabase
        .from("class_requests")
        .delete()
        .in("id", rows.map((row) => row.id));
      if (deleteError) return { ok: false, message: deleteError.message };
      clearedRows.push(...rows);
    }
  }

  return { ok: true, rows: clearedRows };
}

async function restorePendingEnrichmentRequestChoices(
  supabase: SupabaseMutationClient,
  rows: ClearedPendingEnrichmentRequestRow[],
): Promise<WriteFail | { ok: true }> {
  if (rows.length === 0) return { ok: true };
  const { error } = await supabase
    .from("class_requests")
    .insert(rows.map((row) => ({
      id: row.id,
      student_id: row.student_id,
      class_id: row.class_id,
      requested_by_profile_id: row.requested_by_profile_id ?? null,
      status: "pending" as const,
      block: row.block ?? null,
      level: row.level ?? null,
      option_label: row.option_label ?? null,
      created_at: row.created_at ?? undefined,
    })));
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

async function fetchRequestPlacementRows(
  supabase: SupabaseMutationClient,
  input: {
    classIds: string[];
    studentId: string;
  },
): Promise<
  | {
      ok: true;
      requestedClasses: PlacementClassRow[];
      enrollments: Record<string, unknown>[];
      pendingRequests: Record<string, unknown>[];
    }
  | WriteFail
> {
  const { data: requestedClasses, error: classError } = await supabase
    .from("classes")
    .select("id, block, level, schedule_summary, schedule_days, semester_id")
    .in("id", input.classIds);
  if (classError) return { ok: false, message: classError.message };

  const { data: enrollments, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("class_id, status, classes ( id, program, block, level, schedule_summary, schedule_days, semester_id )")
    .eq("student_id", input.studentId)
    .in("status", ["approved", "waitlisted"]);
  if (enrollmentError) return { ok: false, message: enrollmentError.message };

  const { data: pendingRequests, error: pendingRequestError } = await supabase
    .from("class_requests")
    .select("class_id, status, classes ( id, program, block, level, schedule_summary, schedule_days, semester_id )")
    .eq("student_id", input.studentId)
    .eq("status", "pending");
  if (pendingRequestError) return { ok: false, message: pendingRequestError.message };

  return {
    ok: true,
    requestedClasses: (requestedClasses ?? []) as unknown as PlacementClassRow[],
    enrollments: (enrollments ?? []) as unknown as Record<string, unknown>[],
    pendingRequests: (pendingRequests ?? []) as unknown as Record<string, unknown>[],
  };
}

export async function serverInsertEnrichmentRequests(input: {
  studentId?: string;
  choices: {
    classId: string;
    block: string;
    level: string;
    option: string;
    waitlist?: boolean;
  }[];
  submitScope?: "slot" | "choice";
}): Promise<{ ok: true; rows: EnrichmentRequestRow[] } | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const choices = normalizeEnrichmentRequestChoices(input.choices
    .map((choice) => ({
      classId: choice.classId.trim(),
      block: choice.block.trim(),
      level: choice.level.trim(),
      option: choice.option.trim(),
      waitlist: choice.waitlist,
    }))
    .filter((choice) => choice.classId && choice.option));
  if (choices.length === 0) return { ok: false, message: "No class choices submitted" };

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      const studentId = input.studentId?.trim();
      if (!studentId) return { ok: false, message: "Choose a student before submitting class selections" };
      if (!isSupabaseAdminConfigured()) {
        return { ok: false, message: "School records are temporarily unavailable." };
      }

      const admin = createSupabaseAdminClient();
      const semesterId = await resolveCurrentSemesterId(admin);
      if (!semesterId) return { ok: false, message: "Current semester is not available." };
      const studentExists = await ensureStudentExists(admin, studentId);
      if (!studentExists) return { ok: false, message: "Selected student was not found" };

      const requesterProfileId = await resolveClassRequestRequesterProfileId(admin, studentId);
      if (!requesterProfileId) {
        return { ok: false, message: "Could not resolve a profile for the selected student" };
      }

      const cleared = await clearPendingEnrichmentRequestChoices(admin, {
        studentId,
        semesterId,
        choices,
        submitScope: input.submitScope,
      });
      if (!cleared.ok) return cleared;

      const duplicates = await ensureNoDuplicatePendingClassRequests(admin, { studentId, choices });
      if (!duplicates.ok) {
        const restored = await restorePendingEnrichmentRequestChoices(admin, cleared.rows);
        if (!restored.ok) return restored;
        return duplicates;
      }

      const capacity = await ensureClassCapacityForChoices(admin, choices, { semesterId, studentId });
      if (!capacity.ok) {
        const restored = await restorePendingEnrichmentRequestChoices(admin, cleared.rows);
        if (!restored.ok) return restored;
        return capacity;
      }

      const openSlots = await ensureOpenSlotsForRequestChoices(admin, { studentId, choices, semesterId });
      if (!openSlots.ok) {
        const restored = await restorePendingEnrichmentRequestChoices(admin, cleared.rows);
        if (!restored.ok) return restored;
        return openSlots;
      }

      const inserted = await insertEnrichmentRequestRows(admin, {
        studentId,
        requestedByProfileId: requesterProfileId,
        choices,
      });
      if (!inserted.ok) {
        const restored = await restorePendingEnrichmentRequestChoices(admin, cleared.rows);
        if (!restored.ok) return restored;
        return inserted;
      }
      return inserted;
    }

    const studentId = await resolveRequestStudentId(supabase, user.id, input.studentId);
    if (!studentId) return { ok: false, message: "Could not resolve a student for this request" };

    const capacityClient = isSupabaseAdminConfigured() ? createSupabaseAdminClient() : supabase;
    const semesterId = await resolveCurrentSemesterId(capacityClient);
    if (!semesterId) return { ok: false, message: "Current semester is not available." };
    const cleared = await clearPendingEnrichmentRequestChoices(capacityClient, {
      studentId,
      semesterId,
      choices,
      submitScope: input.submitScope,
    });
    if (!cleared.ok) return cleared;

    const duplicates = await ensureNoDuplicatePendingClassRequests(capacityClient, { studentId, choices });
    if (!duplicates.ok) {
      const restored = await restorePendingEnrichmentRequestChoices(capacityClient, cleared.rows);
      if (!restored.ok) return restored;
      return duplicates;
    }

    const capacity = await ensureClassCapacityForChoices(capacityClient, choices, { semesterId, studentId });
    if (!capacity.ok) {
      const restored = await restorePendingEnrichmentRequestChoices(capacityClient, cleared.rows);
      if (!restored.ok) return restored;
      return capacity;
    }

    const openSlots = await ensureOpenSlotsForRequestChoices(capacityClient, { studentId, choices, semesterId });
    if (!openSlots.ok) {
      const restored = await restorePendingEnrichmentRequestChoices(capacityClient, cleared.rows);
      if (!restored.ok) return restored;
      return openSlots;
    }

    const result = await insertEnrichmentRequestRows(supabase, {
      studentId,
      requestedByProfileId: user.id,
      choices,
    });
    if (!result.ok) {
      const restored = await restorePendingEnrichmentRequestChoices(capacityClient, cleared.rows);
      if (!restored.ok) return restored;
      return result;
    }
    await writeAuditEvent(supabase, {
      action: "class_request.create",
      entityType: "class_request",
      entityId: result.rows.map((row) => row.id).join(","),
      metadata: { count: result.rows.length, studentId },
    });
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function serverPatchEnrichmentRequest(
  id: string,
  status: EnrichmentRequestRow["status"],
  options: { reason?: string } = {},
): Promise<WriteOk<EnrichmentRequestRow> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const mutationClient = isSupabaseAdminConfigured() ? createSupabaseAdminClient() : supabase;
    const dbStatus = workflowStatusForRequest(status);

    if (id.startsWith("enrollment:")) {
      const selected = await selectFinalPlacement(mutationClient, id);
      if (!selected.ok) return selected;
      const raw = selected.raw;
      const studentId = String(raw.student_id ?? "").trim();
      const classId = String(raw.class_id ?? "").trim();
      const enrollmentId = String(raw.id ?? "").trim();
      if (!studentId || !classId || !enrollmentId) return { ok: false, message: "Final placement is missing student or class id" };

      if (dbStatus === "pending") {
        const reopened = await reopenFinalPlacementAsRequest(mutationClient, raw);
        if (!reopened.ok) return reopened;
        await writeAuditEvent(supabase, {
          action: "class_request.reopen",
          entityType: "class_request",
          entityId: reopened.row.id,
          metadata: { enrollmentId, studentId, classId, reason: options.reason ?? null },
        });
        return reopened;
      }

      if (dbStatus !== "approved" && dbStatus !== "waitlisted" && dbStatus !== "rejected") {
        return { ok: false, message: "Invalid final status" };
      }

      if (dbStatus === "approved") {
        const allowed = await ensureApprovedRosterPlacementAllowed(mutationClient, {
          classId,
          studentId,
          existingApprovedInClass: String(raw.status ?? "").toLowerCase() === "approved",
        });
        if (!allowed.ok) return allowed;
      }

      const { error: enrollmentError } = await mutationClient
        .from("enrollments")
        .update({ status: dbStatus })
        .eq("id", enrollmentId);
      if (enrollmentError) return { ok: false, message: enrollmentError.message };

      const decision = await latestDecisionMetadata(mutationClient, { studentId, classId });
      const classes = Array.isArray(raw.classes) ? raw.classes[0] : raw.classes;
      const cls = classes && typeof classes === "object" ? classes as Record<string, unknown> : {};
      const logged = await insertClassRequestDecisionLog(mutationClient, {
        id: "",
        student_id: studentId,
        class_id: classId,
        requested_by_profile_id: String(decision?.requested_by_profile_id ?? ""),
        block: String(decision?.block ?? cls.block ?? ""),
        level: String(decision?.level ?? cls.level ?? ""),
        option_label: String(decision?.option_label ?? "Final placement"),
        created_at: String(decision?.requested_at ?? raw.created_at ?? ""),
      }, {
        status: dbStatus,
        decidedByProfileId: user?.id,
        reason: options.reason,
      });
      if (!logged.ok) return logged;

      if (dbStatus === "approved") {
        const cleaned = await clearSameSlotAlternativesAfterApproval(mutationClient, {
          studentId,
          approvedClassId: classId,
          decidedByProfileId: user?.id,
        });
        if (!cleaned.ok) return cleaned;
      }

      const refetched = await selectFinalPlacement(mutationClient, id);
      const row = refetched.ok ? mapFinalPlacementRequestRow(refetched.raw) : mapFinalPlacementRequestRow({ ...raw, status: dbStatus });
      if (!row) return { ok: false, message: "Could not map final placement" };
      await writeAuditEvent(supabase, {
        action: "enrollment.status.update",
        entityType: "enrollment",
        entityId: enrollmentId,
        metadata: { studentId, classId, status: dbStatus, reason: options.reason ?? null },
      });
      return { ok: true, row };
    }

    const { data, error } = dbStatus === "pending"
      ? await mutationClient
          .from("class_requests")
          .update({ status: "pending" })
          .eq("id", id)
          .select(requestSelect)
          .maybeSingle()
      : await mutationClient
          .from("class_requests")
          .select(requestSelect)
          .eq("id", id)
          .maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: dbStatus === "pending" ? "No row updated" : "Request not found" };
    const raw = data as unknown as Record<string, unknown>;
    if (dbStatus !== "pending") {
      const studentId = String(raw.student_id ?? "").trim();
      const classId = String(raw.class_id ?? "").trim();
      if (!studentId || !classId) return { ok: false, message: "Request is missing student or class id" };
      if (dbStatus !== "approved" && dbStatus !== "waitlisted" && dbStatus !== "rejected") {
        return { ok: false, message: "Invalid final status" };
      }

      if (dbStatus === "approved") {
        const allowed = await ensureApprovedRosterPlacementAllowed(mutationClient, {
          classId,
          studentId,
          pendingRequestConsumesSeat: !isWaitlistOptionLabel(raw.option_label),
        });
        if (!allowed.ok) return allowed;
      }

      const { error: enrollmentError } = await mutationClient
        .from("enrollments")
        .upsert(
          {
            student_id: studentId,
            class_id: classId,
            status: dbStatus,
          },
          { onConflict: "class_id,student_id" },
        );
      if (enrollmentError) return { ok: false, message: enrollmentError.message };

      const logged = await insertClassRequestDecisionLog(mutationClient, raw, {
        status: dbStatus,
        decidedByProfileId: user?.id,
        reason: options.reason,
      });
      if (!logged.ok) return logged;

      if (dbStatus === "approved") {
        const cleaned = await clearSameSlotAlternativesAfterApproval(mutationClient, {
          studentId,
          approvedClassId: classId,
          approvedRequestId: id,
          decidedByProfileId: user?.id,
        });
        if (!cleaned.ok) return cleaned;
      }

      const { error: requestDeleteError } = await mutationClient
        .from("class_requests")
        .delete()
        .eq("id", id);
      if (requestDeleteError) return { ok: false, message: requestDeleteError.message };
    }
    const mapped = mapRequestRow(raw);
    if (!mapped) return { ok: false, message: "Could not map request" };
    const row = { ...mapped, status };
    await writeAuditEvent(supabase, {
      action: "class_request.status.update",
      entityType: "class_request",
      entityId: row.id,
      metadata: { status: row.status, reason: options.reason ?? null },
    });
    return { ok: true, row };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function serverDeleteEnrichmentRequest(
  id: string,
  options: { reason?: string } = {},
): Promise<{ ok: true } | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const trimmedId = id.trim();
  if (!trimmedId) return { ok: false, message: "Missing request id" };

  try {
    const supabase = await createSupabaseServerClient();
    const mutationClient = isSupabaseAdminConfigured() ? createSupabaseAdminClient() : supabase;

    if (trimmedId.startsWith("enrollment:")) {
      const selected = await selectFinalPlacement(mutationClient, trimmedId);
      if (!selected.ok) return selected;
      const raw = selected.raw;
      const enrollmentId = String(raw.id ?? "").trim();
      const studentId = String(raw.student_id ?? "").trim();
      const classId = String(raw.class_id ?? "").trim();
      const { error } = await mutationClient
        .from("enrollments")
        .delete()
        .eq("id", enrollmentId);
      if (error) return { ok: false, message: error.message };
      await writeAuditEvent(supabase, {
        action: "enrollment.delete",
        entityType: "enrollment",
        entityId: enrollmentId,
        metadata: { studentId, classId, reason: options.reason ?? null, source: "enrichment_requests" },
      });
      return { ok: true };
    }

    const { data, error: selectError } = await mutationClient
      .from("class_requests")
      .select("id, student_id, class_id")
      .eq("id", trimmedId)
      .maybeSingle();
    if (selectError) return { ok: false, message: selectError.message };
    if (!data) return { ok: false, message: "Request not found" };

    const { error } = await mutationClient
      .from("class_requests")
      .delete()
      .eq("id", trimmedId);
    if (error) return { ok: false, message: error.message };

    await writeAuditEvent(supabase, {
      action: "class_request.delete",
      entityType: "class_request",
      entityId: trimmedId,
      metadata: {
        studentId: String((data as Record<string, unknown>).student_id ?? ""),
        classId: String((data as Record<string, unknown>).class_id ?? ""),
        reason: options.reason ?? null,
      },
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

function scheduleBounds(eventDate: string, timeLabel: string): { starts_at: string; ends_at: string } {
  const hm = /^(\d{1,2}):(\d{2})/.exec(timeLabel.trim());
  const hh = String(hm ? Number(hm[1]) : 12).padStart(2, "0");
  const mm = String(hm ? Number(hm[2]) : 0).padStart(2, "0");
  const starts = `${eventDate}T${hh}:${mm}:00.000Z`;
  const t0 = Date.parse(starts);
  const ends = new Date(Number.isFinite(t0) ? t0 + 90 * 60 * 1000 : Date.now() + 90 * 60 * 1000).toISOString();
  return { starts_at: Number.isFinite(t0) ? new Date(t0).toISOString() : starts, ends_at: ends };
}

export async function serverInsertScheduleEvent(input: {
  eventDate: string;
  timeLabel: string;
  title: string;
  eventType: ScheduleCalendarEvent["type"];
  description?: string;
}): Promise<WriteOk<{ id: string }> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  try {
    const supabase = await createSupabaseServerClient();
    const { starts_at, ends_at } = scheduleBounds(input.eventDate, input.timeLabel);
    const payload = {
      class_id: null as string | null,
      title: input.title.trim(),
      starts_at,
      ends_at,
      location: input.description?.trim() ?? null,
    };
    const { data, error } = await supabase.from("schedule_events").insert(payload).select("id").maybeSingle();
    if (error) return { ok: false, message: error.message };
    const idRaw = data && typeof data === "object" && "id" in data ? (data as { id: unknown }).id : null;
    const id = idRaw != null ? String(idRaw) : `db-${input.eventDate}-${Date.now()}`;
    await writeAuditEvent(supabase, {
      action: "schedule_event.create",
      entityType: "schedule_event",
      entityId: id,
      metadata: { title: input.title, eventDate: input.eventDate },
    });
    return { ok: true, row: { id } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function serverPatchNotificationsReadAll(ids?: string[]): Promise<WriteFail | { ok: true }> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const notificationIds = (ids ?? []).map((id) => id.trim()).filter(Boolean);
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: ue,
    } = await supabase.auth.getUser();

    if (ue || !user) {
      return { ok: false, message: "Not signed in" };
    }

    let query = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_profile_id", user.id)
      .is("read_at", null);
    if (notificationIds.length > 0) query = query.in("id", notificationIds);

    const { error } = await query;
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function serverPatchNotificationRead(
  id: string,
  read: boolean,
): Promise<WriteOk<DashboardNotification> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const notificationId = id.trim();
  if (!notificationId) return { ok: false, message: "Missing notification id" };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: ue,
    } = await supabase.auth.getUser();

    if (ue || !user) {
      return { ok: false, message: "Not signed in" };
    }

    const query = supabase
      .from("notifications")
      .update({ read_at: read ? new Date().toISOString() : null })
      .eq("id", notificationId)
      .eq("recipient_profile_id", user.id);

    const { data, error } = await query.select("id, title, body, href, read_at, created_at").maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "Notification was not found for this account" };
    const mapped = mapNotificationRow(data as unknown as Record<string, unknown>);
    if (!mapped) return { ok: false, message: "Could not map notification" };
    return { ok: true, row: mapped };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}
