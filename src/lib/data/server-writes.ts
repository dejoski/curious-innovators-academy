import { mapClassRow } from "@/lib/data/repositories/classes";
import { mapNotificationRow } from "@/lib/data/repositories/notifications";
import { mapRequestRow } from "@/lib/data/repositories/requests";
import { mapStudentRow } from "@/lib/data/repositories/students";
import { mapTeacherRow } from "@/lib/data/repositories/teachers";
import { isSupabaseConfigured } from "@/lib/data/env";
import type {
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
    const payload = {
      name: input.name.trim(),
      teacher_id: teacherId,
      program: (input.track ?? "core") as "core" | "enrichment",
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 30,
      schedule_summary: input.schedule.trim(),
      status: input.status === "Full" ? ("full" as const) : ("active" as const),
    };
    const { data, error } = await supabase.from("classes").insert(payload).select("*").maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "No row returned" };
    const mapped = mapClassRow(
      await flattenClassRowForMap(supabase, data as Record<string, unknown>),
    );
    if (!mapped) return { ok: false, message: "Could not map saved class" };
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
    const payload = {
      name: input.name.trim(),
      teacher_id: teacherId,
      program: (input.track ?? "core") as "core" | "enrichment",
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 30,
      schedule_summary: input.schedule.trim(),
      status: input.status === "Full" ? ("full" as const) : ("active" as const),
    };
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
      guardian_label: input.parent.trim(),
      level: input.level.trim(),
      track: input.track,
    };
    const { data, error } = await supabase.from("students").insert(payload).select("*").maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "No row returned" };
    const withNotes =
      input.notes?.trim() && data.id
        ? { ...(data as Record<string, unknown>), notes: input.notes.trim() }
        : (data as Record<string, unknown>);
    const mapped = mapStudentRow(withNotes);
    if (!mapped) return { ok: false, message: "Could not map saved student" };
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
    return { ok: true, row: mapped };
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
  try {
    const supabase = await createSupabaseServerClient();
    const { data: profile, error: pe } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", input.email.trim())
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
        phone: (input.phone ?? "").trim() || "(555) 000-0000",
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
