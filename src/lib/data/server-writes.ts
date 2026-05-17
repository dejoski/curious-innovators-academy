import { mapClassRow } from "@/lib/data/repositories/classes";
import { mapNotificationRow } from "@/lib/data/repositories/notifications";
import { mapRequestRow } from "@/lib/data/repositories/requests";
import { mapStudentRow } from "@/lib/data/repositories/students";
import { mapTeacherRow } from "@/lib/data/repositories/teachers";
import { isSupabaseConfigured } from "@/lib/data/env";
import type {
  ClassRosterStatus,
  ClassRosterStudent,
  DashboardNotification,
  EnrichmentRequestRow,
  ScheduleCalendarEvent,
  SchoolClassRow,
  StudentListItem,
  TeacherRow,
} from "@/lib/data/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type WriteFail = { ok: false; message: string };
export type WriteOk<T> = { ok: true; row: T };

function parseStudentsFraction(label: string): { enrolled: number; capacity: number } {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(label.trim());
  if (!m) return { enrolled: 0, capacity: 1 };
  return { enrolled: Number(m[1]), capacity: Number(m[2]) };
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
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase not configured" };
  const { capacity } = parseStudentsFraction(input.students);
  try {
    const supabase = await createSupabaseServerClient();
    const teacherId = await resolveTeacherIdByDisplayName(supabase, input.teacher);
    if (!teacherId) {
      return {
        ok: false,
        message:
          "Could not match teacher name to a profile. Add the teacher in Supabase or use an exact display name from the roster.",
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
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase not configured" };
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
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase not configured" };
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
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase not configured" };
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

export async function serverDeleteStudent(id: string): Promise<{ ok: true } | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase not configured" };
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
  },
): Promise<WriteOk<StudentListItem> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase not configured" };
  try {
    const supabase = await createSupabaseServerClient();
    const payload: Record<string, unknown> = {};
    if (input.name != null) payload.display_name = input.name.trim();
    if (input.level != null) payload.level = input.level.trim();
    if (Object.keys(payload).length === 0) {
      return { ok: false, message: "No fields to update" };
    }
    const { data, error } = await supabase
      .from("students")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "No row updated" };
    const mapped = mapStudentRow(data as Record<string, unknown>);
    if (!mapped) return { ok: false, message: "Could not map updated student" };
    await writeAuditEvent(supabase, {
      action: "student.update",
      entityType: "student",
      entityId: mapped.id,
      metadata: { fields: Object.keys(payload) },
    });
    return { ok: true, row: mapped };
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
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase not configured" };
  const classId = input.classId.trim();
  const studentId = input.studentId.trim();
  if (!classId || !studentId) return { ok: false, message: "Missing class or student id" };

  try {
    const supabase = await createSupabaseServerClient();
    const dbStatus = input.status === "Approved" ? "approved" : input.status === "Rejected" ? "rejected" : "pending";
    const { error } = await supabase
      .from("enrollments")
      .update({ status: dbStatus })
      .eq("class_id", classId)
      .eq("student_id", studentId);
    if (error) return { ok: false, message: error.message };
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
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase not configured" };
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
  name: string;
  parent: string;
  age?: number;
  level: string;
  status: ClassRosterStatus;
  description?: string;
}): Promise<WriteOk<ClassRosterStudent> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase not configured" };
  const classId = input.classId.trim();
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!classId || !name) return { ok: false, message: "Missing class or student name" };

  try {
    const supabase = await createSupabaseServerClient();
    const { data: classRow, error: classError } = await supabase
      .from("classes")
      .select("id, program")
      .eq("id", classId)
      .maybeSingle();
    if (classError) return { ok: false, message: classError.message };
    if (!classRow) return { ok: false, message: "Class not found" };

    const age = Number.isFinite(input.age) && Number(input.age) >= 0 ? Math.round(Number(input.age)) : null;
    const { data: student, error: studentError } = await supabase
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
    if (studentError) return { ok: false, message: studentError.message };
    if (!student?.id) return { ok: false, message: "Student could not be created" };

    const dbStatus = input.status === "Approved" ? "approved" : input.status === "Rejected" ? "rejected" : "pending";
    const { error: enrollmentError } = await supabase.from("enrollments").insert({
      class_id: classId,
      student_id: student.id,
      status: dbStatus,
    });
    if (enrollmentError) return { ok: false, message: enrollmentError.message };

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
      metadata: { classId, studentId: row.id, status: dbStatus, createdStudent: true },
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
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase not configured" };
  const classId = input.classId.trim();
  const studentId = input.studentId.trim();
  if (!classId || !studentId) return { ok: false, message: "Missing class or student id" };

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
    const dbStatus = status === "Approved" ? "approved" : status === "Rejected" ? "rejected" : "pending";
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
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase not configured" };
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
    const mapped = mapTeacherRow(data as unknown as Record<string, unknown>);
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
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase not configured" };
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
    const mapped = mapTeacherRow(data as unknown as Record<string, unknown>);
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
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase not configured" };
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
  status,
  block,
  level,
  option_label,
  students ( display_name, guardian_label ),
  classes ( name ),
  requester:profiles!class_requests_requested_by_profile_id_fkey ( display_name, email )
`;

async function resolveRequestStudentId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
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

export async function serverInsertEnrichmentRequests(input: {
  studentId?: string;
  choices: {
    classId: string;
    block: string;
    level: string;
    option: string;
  }[];
}): Promise<{ ok: true; rows: EnrichmentRequestRow[] } | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase not configured" };
  const choices = input.choices
    .map((choice) => ({
      classId: choice.classId.trim(),
      block: choice.block.trim(),
      level: choice.level.trim(),
      option: choice.option.trim(),
    }))
    .filter((choice) => choice.classId && choice.option);
  if (choices.length === 0) return { ok: false, message: "No class choices submitted" };

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { ok: false, message: "Not signed in" };

    const studentId = await resolveRequestStudentId(supabase, user.id, input.studentId);
    if (!studentId) return { ok: false, message: "Could not resolve a student for this request" };

    const payload = choices.map((choice) => ({
      student_id: studentId,
      class_id: choice.classId,
      requested_by_profile_id: user.id,
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
    await writeAuditEvent(supabase, {
      action: "class_request.create",
      entityType: "class_request",
      entityId: rows.map((row) => row.id).join(","),
      metadata: { count: rows.length, studentId },
    });
    return { ok: true, rows };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function serverPatchEnrichmentRequest(
  id: string,
  status: EnrichmentRequestRow["status"],
): Promise<WriteOk<EnrichmentRequestRow> | WriteFail> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase not configured" };
  try {
    const supabase = await createSupabaseServerClient();
    const dbStatus = status.toLowerCase();
    const { data, error } = await supabase
      .from("class_requests")
      .update({ status: dbStatus })
      .eq("id", id)
      .select(requestSelect)
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "No row updated" };
    const mapped = mapRequestRow(data as unknown as Record<string, unknown>);
    if (!mapped) return { ok: false, message: "Could not map request" };
    await writeAuditEvent(supabase, {
      action: "class_request.status.update",
      entityType: "class_request",
      entityId: mapped.id,
      metadata: { status: mapped.status },
    });
    return { ok: true, row: mapped };
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
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase not configured" };
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

export async function serverPatchNotificationsReadAll(): Promise<WriteFail | { ok: true }> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase not configured" };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: ue,
    } = await supabase.auth.getUser();
    if (ue || !user) return { ok: false, message: "Not signed in" };
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_profile_id", user.id)
      .is("read_at", null);
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
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase not configured" };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: read ? new Date().toISOString() : null })
      .eq("id", id)
      .select("id, title, body, href, read_at, created_at")
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "No row updated" };
    const mapped = mapNotificationRow(data as unknown as Record<string, unknown>);
    if (!mapped) return { ok: false, message: "Could not map notification" };
    return { ok: true, row: mapped };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}
