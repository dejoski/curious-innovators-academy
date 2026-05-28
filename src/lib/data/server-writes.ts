import "server-only";

import { mapClassRow } from "@/lib/data/repositories/classes";
import { mapNotificationRow } from "@/lib/data/repositories/notifications";
import { mapParentRow } from "@/lib/data/repositories/parents";
import { mapRequestRow } from "@/lib/data/repositories/requests";
import { mapStudentRow, STUDENT_SELECT } from "@/lib/data/repositories/students";
import { mapTeacherRow } from "@/lib/data/repositories/teachers";
import { isSupabaseConfigured } from "@/lib/data/env";
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
  program?: unknown;
  block?: unknown;
  schedule_summary?: unknown;
};

function cleanContactEmail(raw: string | null | undefined): string {
  return String(raw ?? "").trim().toLowerCase();
}

function isValidContactEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function temporaryAccountPassword(): string {
  return `Cia-${crypto.randomUUID()}-Aa1!`;
}

function workflowStatusForRoster(status: ClassRosterStatus) {
  if (status === "Approved") return "approved";
  if (status === "Waitlisted") return "waitlisted";
  if (status === "Rejected") return "rejected";
  return "pending";
}

function classPlacementSlot(row: PlacementClassRow): string | null {
  const source = `${String(row.block ?? "")} ${String(row.schedule_summary ?? "")}`.toLowerCase();
  if (!/\b(?:block|b)\s*[1-4]\b/.test(source)) return null;
  return scheduleSlotForClassFields({
    block: row.block,
    scheduleSummary: row.schedule_summary,
  });
}

function parseStudentsFraction(label: string): { enrolled: number; capacity: number } {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(label.trim());
  if (!m) return { enrolled: 0, capacity: 1 };
  return { enrolled: Number(m[1]), capacity: Number(m[2]) };
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

async function authUserIdForEmail(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  email: string,
): Promise<string | null> {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const found = data.users?.find((user) => String(user.email ?? "").toLowerCase() === email);
    if (found?.id) return found.id;
    if (!data.users || data.users.length < 1000) return null;
    page += 1;
  }
}

async function ensureParentProfileForEmail(
  client: SupabaseMutationClient,
  input: { displayName: string; email: string },
): Promise<{ ok: true; parentId: string; profileId: string } | WriteFail> {
  const displayName = input.displayName.trim() || "Parent";
  const email = cleanContactEmail(input.email);
  if (!isValidContactEmail(email)) return { ok: false, message: "Enter a valid parent email address" };

  const { data: existingProfile, error: profileReadError } = await client
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (profileReadError) return { ok: false, message: profileReadError.message };

  let profileId = String(existingProfile?.id ?? "");
  if (!profileId) {
    if (!isSupabaseAdminConfigured()) {
      return { ok: false, message: "Parent account setup is temporarily unavailable." };
    }
    const admin = createSupabaseAdminClient();
    profileId = (await authUserIdForEmail(admin, email)) ?? "";
    if (!profileId) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: temporaryAccountPassword(),
        email_confirm: true,
        user_metadata: { full_name: displayName },
      });
      if (error || !data.user?.id) {
        return { ok: false, message: error?.message ?? "Could not create parent account" };
      }
      profileId = data.user.id;
    }
  }

  const { error: profileWriteError } = await client.from("profiles").upsert(
    {
      id: profileId,
      role: "parent",
      display_name: displayName,
      email,
    },
    { onConflict: "id" },
  );
  if (profileWriteError) return { ok: false, message: profileWriteError.message };

  const { data: parent, error: parentError } = await client
    .from("parents")
    .upsert({ profile_id: profileId }, { onConflict: "profile_id" })
    .select("id")
    .maybeSingle();
  if (parentError) return { ok: false, message: parentError.message };
  if (!parent?.id) return { ok: false, message: "Could not create parent record" };

  return { ok: true, parentId: String(parent.id), profileId };
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

export async function serverInsertClass(input: {
  name: string;
  teacher: string;
  students: string;
  schedule: string;
  status: SchoolClassRow["status"];
  track?: "core" | "enrichment";
  description?: string;
  level?: string;
  block?: string;
}): Promise<WriteOk<SchoolClassRow> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const { capacity } = parseStudentsFraction(input.students);
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
    const payload: Record<string, unknown> = {
      name: input.name.trim(),
      teacher_id: teacherId,
      program: (input.track ?? "core") as "core" | "enrichment",
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 30,
      schedule_summary: input.schedule.trim(),
      status: input.status === "Full" ? ("full" as const) : ("active" as const),
    };
    if (input.description != null) payload.description = input.description.trim();
    if (input.level != null) payload.level = input.level.trim();
    if (input.block != null) payload.block = input.block.trim();
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
      metadata: { name: mapped.name, program: mapped.program },
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
    students: string;
    schedule: string;
    status: SchoolClassRow["status"];
    track?: "core" | "enrichment";
    description?: string;
    level?: string;
    block?: string;
  },
): Promise<WriteOk<SchoolClassRow> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const { capacity } = parseStudentsFraction(input.students);
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
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 30,
      schedule_summary: input.schedule.trim(),
      status: input.status === "Full" ? ("full" as const) : ("active" as const),
    };
    if (input.description != null) payload.description = input.description.trim();
    if (input.level != null) payload.level = input.level.trim();
    if (input.block != null) payload.block = input.block.trim();
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
      metadata: { name: mapped.name, program: mapped.program },
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
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) return { ok: false, message: error.message };
    await writeAuditEvent(supabase, {
      action: "class.delete",
      entityType: "class",
      entityId: id,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function serverInsertStudent(input: {
  name: string;
  parent: string;
  level: string;
  track: "core" | "enrichment";
  notes?: string;
}): Promise<WriteOk<StudentListItem> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  try {
    const supabase = await createSupabaseServerClient();
    const payload = {
      display_name: input.name.trim(),
      guardian_label: input.parent.trim() || null,
      level: input.level.trim(),
      track: input.track,
      support_notes: input.notes?.trim() ?? "",
    };
    const { data, error } = await supabase.from("students").insert(payload).select("*").maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "No row returned" };
    const mapped = mapStudentRow(data as Record<string, unknown>);
    if (!mapped) return { ok: false, message: "Could not map saved student" };
    await writeAuditEvent(supabase, {
      action: "student.create",
      entityType: "student",
      entityId: mapped.id,
      metadata: { name: mapped.name, track: mapped.track },
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
  const ensured = await ensureParentProfileForEmail(access.client, {
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
      const parent = await ensureParentProfileForEmail(client, {
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
      .select("id, program")
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
        .select("id, display_name, guardian_label, age_years, level, support_notes")
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
        .select("id, display_name, guardian_label, age_years, level, support_notes")
        .maybeSingle();
      if (error) return { ok: false, message: error.message };
      if (!data?.id) return { ok: false, message: "Student could not be created" };
      student = data;
      createdStudent = true;
    }

    const dbStatus = workflowStatusForRoster(input.status);
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
      parent: String(student.guardian_label ?? "—"),
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
        .select("id, display_name, guardian_label, age_years, level, support_notes")
        .maybeSingle();
      if (error) return { ok: false, message: error.message };
      if (!data) return { ok: false, message: "No student row updated" };
      studentRow = data as unknown as Record<string, unknown>;
    } else {
      const { data, error } = await supabase
        .from("students")
        .select("id, display_name, guardian_label, age_years, level, support_notes")
        .eq("id", studentId)
        .maybeSingle();
      if (error) return { ok: false, message: error.message };
      if (!data) return { ok: false, message: "Student not found" };
      studentRow = data as unknown as Record<string, unknown>;
    }

    const status = input.status ?? "Pending";
    const dbStatus = workflowStatusForRoster(status);
    if (input.status != null) {
      const { error } = await supabase
        .from("enrollments")
        .update({ status: dbStatus })
        .eq("class_id", classId)
        .eq("student_id", studentId);
      if (error) return { ok: false, message: error.message };
    }

    const row: ClassRosterStudent = {
      id: String(studentRow.id ?? studentId),
      name: String(studentRow.display_name ?? input.name ?? ""),
      parent: String(studentRow.guardian_label ?? input.parent ?? "—"),
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
  students ( display_name, guardian_label ),
  classes ( id, name, program, block, schedule_summary ),
  requester:profiles!class_requests_requested_by_profile_id_fkey ( display_name, email )
`;

type FinalRequestDecisionStatus = "approved" | "waitlisted" | "rejected";

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
    option_label: choice.option,
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
  }[],
): Promise<WriteFail | { ok: true }> {
  const requestedByClass = choices.reduce<Map<string, number>>((next, choice) => {
    next.set(choice.classId, (next.get(choice.classId) ?? 0) + 1);
    return next;
  }, new Map());
  const classIds = [...requestedByClass.keys()];
  if (classIds.length === 0) return { ok: true };

  const [{ data: availability, error: availabilityError }, { data: classes, error: classesError }] = await Promise.all([
    supabase
      .from("class_catalog_availability")
      .select("class_id, seats_remaining, availability_label")
      .in("class_id", classIds),
    supabase
      .from("classes")
      .select("id, name")
      .in("id", classIds),
  ]);

  if (availabilityError) return { ok: false, message: availabilityError.message };
  if (classesError) return { ok: false, message: classesError.message };

  const availabilityByClassId = new Map(
    ((availability ?? []) as unknown as Record<string, unknown>[]).map((row) => [String(row.class_id), row]),
  );
  const classNamesById = new Map(
    ((classes ?? []) as unknown as Record<string, unknown>[]).map((row) => [String(row.id), String(row.name ?? "Selected class")]),
  );
  for (const classId of classIds) {
    const row = availabilityByClassId.get(classId);
    if (!row || !classNamesById.has(classId)) return { ok: false, message: "Selected class was not found" };

    const remaining = Math.max(0, Math.floor(Number(row.seats_remaining ?? 0)));
    const requested = requestedByClass.get(classId) ?? 0;
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

async function clearSameSlotAlternativesAfterApproval(
  supabase: SupabaseMutationClient,
  input: {
    studentId: string;
    approvedClassId: string;
    approvedRequestId?: string;
    decidedByProfileId?: string | null;
  },
): Promise<WriteFail | { ok: true }> {
  const { data: approvedClass, error: approvedClassError } = await supabase
    .from("classes")
    .select("id, program, block, schedule_summary")
    .eq("id", input.approvedClassId)
    .maybeSingle();
  if (approvedClassError) return { ok: false, message: approvedClassError.message };
  if (!approvedClass) return { ok: false, message: "Approved class was not found" };

  const approved = approvedClass as PlacementClassRow;
  if (String(approved.program ?? "").toLowerCase() !== "enrichment") return { ok: true };

  const approvedSlot = classPlacementSlot(approved);
  const { data: classRows, error: classesError } = await supabase
    .from("classes")
    .select("id, program, block, schedule_summary")
    .eq("program", "enrichment");
  if (classesError) return { ok: false, message: classesError.message };

  const sameSlotClassIds = ((classRows ?? []) as PlacementClassRow[])
    .filter((row) => String(row.id ?? "") && classPlacementSlot(row) === approvedSlot)
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
  }[],
) {
  const bySlot = new Map<string, {
    first?: { classId: string; block: string; level: string; option: "1st" };
    second?: { classId: string; block: string; level: string; option: "2nd" };
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

  const normalized: { classId: string; block: string; level: string; option: "1st" | "2nd" }[] = [];
  bySlot.forEach((group) => {
    const first = group.first ?? (group.second ? { ...group.second, option: "1st" as const } : null);
    if (!first) return;
    normalized.push(first);
    if (group.first && group.second && group.second.classId !== first.classId) {
      normalized.push(group.second);
    }
  });

  return normalized;
}

async function clearPendingEnrichmentRequestChoices(
  supabase: SupabaseMutationClient,
  input: {
    studentId: string;
    choices: {
      block: string;
      level: string;
      option: string;
    }[];
  },
): Promise<WriteFail | { ok: true }> {
  const touchedSlots = new Set<string>();
  for (const choice of input.choices) {
    const slotKey = requestSlotKey(choice);
    if (touchedSlots.has(slotKey)) continue;
    touchedSlots.add(slotKey);

    let query = supabase
      .from("class_requests")
      .delete()
      .eq("student_id", input.studentId)
      .eq("status", "pending");

    query = choice.block ? query.eq("block", choice.block) : query.is("block", null);
    query = choice.level ? query.eq("level", choice.level) : query.is("level", null);

    const { error } = await query;
    if (error) return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function serverInsertEnrichmentRequests(input: {
  studentId?: string;
  choices: {
    classId: string;
    block: string;
    level: string;
    option: string;
  }[];
}): Promise<{ ok: true; rows: EnrichmentRequestRow[] } | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const choices = normalizeEnrichmentRequestChoices(input.choices
    .map((choice) => ({
      classId: choice.classId.trim(),
      block: choice.block.trim(),
      level: choice.level.trim(),
      option: choice.option.trim(),
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
      const studentExists = await ensureStudentExists(admin, studentId);
      if (!studentExists) return { ok: false, message: "Selected student was not found" };

      const requesterProfileId = await resolveClassRequestRequesterProfileId(admin, studentId);
      if (!requesterProfileId) {
        return { ok: false, message: "Could not resolve a profile for the selected student" };
      }

      const cleared = await clearPendingEnrichmentRequestChoices(admin, {
        studentId,
        choices,
      });
      if (!cleared.ok) return cleared;

      const capacity = await ensureClassCapacityForChoices(admin, choices);
      if (!capacity.ok) return capacity;

      return insertEnrichmentRequestRows(admin, {
        studentId,
        requestedByProfileId: requesterProfileId,
        choices,
      });
    }

    const studentId = await resolveRequestStudentId(supabase, user.id, input.studentId);
    if (!studentId) return { ok: false, message: "Could not resolve a student for this request" };

    const capacityClient = isSupabaseAdminConfigured() ? createSupabaseAdminClient() : supabase;
    const cleared = await clearPendingEnrichmentRequestChoices(capacityClient, {
      studentId,
      choices,
    });
    if (!cleared.ok) return cleared;

    const capacity = await ensureClassCapacityForChoices(capacityClient, choices);
    if (!capacity.ok) return capacity;

    const result = await insertEnrichmentRequestRows(supabase, {
      studentId,
      requestedByProfileId: user.id,
      choices,
    });
    if (!result.ok) return result;
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
    const dbStatus = status.toLowerCase();
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
