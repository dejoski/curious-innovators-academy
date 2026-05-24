import type { DataSource, ResolvedList } from "@/lib/data/fetch-source";
import type {
  ProgramTrack,
  StudentProfileBundle,
  StudentProfileTimelineEvent,
  StudentRosterRow,
  StudentRosterStatus,
  StudentScheduleBadge,
  StudentScheduleRow,
} from "@/lib/data/types";
import { canUseBundledFallbackData, isSupabaseConfigured } from "@/lib/data/env";
import {
  buildGenericStudentProfileFallback,
  STUDENT_PROFILE_FALLBACK_BY_ID,
  STUDENT_ROSTER_FALLBACK_ROWS,
  STUDENT_SCHEDULE_FALLBACK_ROWS,
} from "@/lib/data/mock/student-detail";
import { emptyScheduleBadgesBySlot, scheduleSlotForClassFields, type ParentScheduleSlotKey } from "@/lib/schedule-slots";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type StudentProfileResolved = {
  profile: StudentProfileBundle | null;
  source: DataSource;
};

type StudentScheduleResolved = {
  rows: StudentScheduleRow[];
  source: DataSource;
};

const SCHOOL_TIME_ZONE = "America/New_York";

function fallbackProfile(studentId: string): StudentProfileResolved {
  if (!canUseBundledFallbackData()) return { profile: null, source: "unavailable" };
  return {
    profile: STUDENT_PROFILE_FALLBACK_BY_ID[studentId] ?? buildGenericStudentProfileFallback(studentId),
    source: "fallback",
  };
}

function fallbackSchedule(studentId: string): StudentScheduleResolved {
  if (!canUseBundledFallbackData()) return { rows: [], source: "unavailable" };
  const exact = STUDENT_SCHEDULE_FALLBACK_ROWS.filter((row) => row.id === studentId);
  return {
    rows: exact.length > 0 ? exact : STUDENT_SCHEDULE_FALLBACK_ROWS,
    source: "fallback",
  };
}

function fallbackRoster(): ResolvedList<StudentRosterRow> {
  if (!canUseBundledFallbackData()) return { items: [], source: "unavailable" };
  return {
    items: [...STUDENT_ROSTER_FALLBACK_ROWS],
    source: "fallback",
  };
}

function firstRel<T extends Record<string, unknown>>(v: unknown): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return v as T;
}

function normalizeProgram(raw: unknown): ProgramTrack {
  const s = String(raw ?? "core").toLowerCase();
  return s === "enrichment" ? "enrichment" : "core";
}

function normalizeRosterStatus(raw: unknown): StudentRosterStatus {
  const s = String(raw ?? "").toLowerCase();
  if (s === "approved") return "Approved";
  if (s === "waitlist" || s === "waitlisted" || s === "rejected") return "Waitlist";
  return "Pending";
}

function formatDate(raw: unknown): string {
  const d = typeof raw === "string" ? new Date(raw) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: SCHOOL_TIME_ZONE,
  });
}

function formatTime(raw: unknown): string {
  const d = typeof raw === "string" ? new Date(raw) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: SCHOOL_TIME_ZONE,
  });
}

function eventTypeFromBody(body: string): StudentProfileTimelineEvent["type"] {
  const s = body.toLowerCase();
  if (s.includes("incident") || s.includes("wellness") || s.includes("behavior")) return "Behavioral";
  if (s.includes("deadline") || s.includes("assessment") || s.includes("enrichment")) return "Academic";
  return "General";
}

export function mapStudentRecord(row: Record<string, unknown>): StudentProfileTimelineEvent | null {
  const id = String(row.id ?? "");
  if (!id) return null;
  const body = String(row.body ?? "");
  const profile = firstRel<Record<string, unknown>>(row.profiles);
  const category = String(row.category ?? "");
  const type: StudentProfileTimelineEvent["type"] =
    category === "Academic" || category === "Behavioral" || category === "General"
      ? category
      : eventTypeFromBody(body);
  const title = String(row.title ?? "").trim();
  return {
    id,
    type,
    author: String(profile?.display_name ?? "Coordinator"),
    role: String(profile?.role ?? "School team"),
    date: formatDate(row.created_at),
    time: formatTime(row.created_at),
    urgent: Boolean(row.urgent) || (type === "Academic" && body.toLowerCase().includes("deadline")),
    title: title || (type === "Behavioral" ? "Student note" : "Progress note"),
    content: body,
  };
}

function classNameShort(name: string): string {
  const trimmed = name.trim();
  return trimmed || "Class";
}

function emptyScheduleRow(input: {
  id: string;
  name: string;
  parent: string;
  avatar?: string;
}): StudentScheduleRow {
  const empty = emptyScheduleBadgesBySlot();
  return {
    id: input.id,
    name: input.name,
    parent: input.parent,
    avatar: input.avatar || "/images/avatars/student-1.png",
    b1: empty.b1,
    b2: empty.b2,
    b3Tue: empty.b3Tue,
    b3Wed: empty.b3Wed,
    b3Thu: empty.b3Thu,
    b4Tue: empty.b4Tue,
    b4Wed: empty.b4Wed,
    b4Thu: empty.b4Thu,
  };
}

function scheduleSlotForClass(row: Record<string, unknown>, index: number): ParentScheduleSlotKey {
  const classRow = firstRel<Record<string, unknown>>(row.classes);
  return scheduleSlotForClassFields({
    block: classRow?.block ?? row.block,
    scheduleSummary: classRow?.schedule_summary,
    fallbackIndex: index,
  });
}

function badgeForEnrollment(row: Record<string, unknown>): StudentScheduleBadge {
  const classRow = firstRel<Record<string, unknown>>(row.classes);
  const program = normalizeProgram(classRow?.program);
  const status = String(row.status ?? "").toLowerCase();
  return {
    label: classNameShort(String(classRow?.name ?? "")),
    tone: program === "core" ? "core" : status === "approved" ? "approved" : "pending",
  };
}

function pushBadge(row: StudentScheduleRow, slot: ParentScheduleSlotKey, badge: StudentScheduleBadge) {
  const current = row[slot];
  const next = current.filter((item) => item.tone !== "empty");
  next.push(badge);
  row[slot] = next;
}

export async function fetchStudentProfileResolved(studentId: string): Promise<StudentProfileResolved> {
  const id = studentId.trim();
  if (!id) return { profile: null, source: "unavailable" };
  if (!isSupabaseConfigured()) return fallbackProfile(id);

  try {
    const supabase = await createSupabaseServerClient();
    const { data: student, error } = await supabase
      .from("students")
      .select(
        "id, display_name, guardian_label, age_years, level, track, learning_profile, strengths, support_notes",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return fallbackProfile(id);
    if (!student) return { profile: null, source: "remote" };

    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("id, status, classes ( id, name, program )")
      .eq("student_id", id)
      .order("created_at", { ascending: true });

    const { data: records } = await supabase
      .from("student_records")
      .select("id, title, body, category, urgent, created_at, profiles ( display_name, role )")
      .eq("student_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    const enrollmentRows = (enrollments ?? []) as unknown as Record<string, unknown>[];
    const coreClasses = enrollmentRows
      .map((row) => firstRel<Record<string, unknown>>(row.classes))
      .filter((row): row is Record<string, unknown> => row !== null)
      .filter((row) => normalizeProgram(row.program) === "core")
      .map((row) => ({ id: String(row.id), name: String(row.name ?? "") }));
    const enrichmentRows = enrollmentRows.filter((row) => {
      const cls = firstRel<Record<string, unknown>>(row.classes);
      return normalizeProgram(cls?.program) === "enrichment";
    });
    const enrichmentClasses = enrichmentRows
      .map((row) => firstRel<Record<string, unknown>>(row.classes))
      .filter((row): row is Record<string, unknown> => row !== null)
      .map((row) => ({ id: String(row.id), name: String(row.name ?? "") }));
    const pending = enrichmentRows.filter((row) => String(row.status ?? "").toLowerCase() !== "approved").length;
    const approved = enrichmentRows.length - pending;
    const timeline = ((records ?? []) as unknown as Record<string, unknown>[])
      .map(mapStudentRecord)
      .filter((row): row is StudentProfileTimelineEvent => row !== null);

    return {
      source: "remote",
      profile: {
        avatar: "/images/avatars/student-1.png",
        details: {
          name: String(student.display_name ?? ""),
          age: student.age_years == null ? "—" : String(student.age_years),
          level: String(student.level ?? ""),
          learningProfile: String(student.learning_profile ?? "") || "—",
          strengths: String(student.strengths ?? "") || "—",
          supportNotes: String(student.support_notes ?? "") || "—",
        },
        parentName: String(student.guardian_label ?? ""),
        parentHref: "/dashboard/parents",
        coreSummaryLabel: `Core: ${coreClasses.length}`,
        enrichmentSummaryLabel: `Enrichment: ${approved} / ${enrichmentRows.length}`,
        pendingLabel: pending > 0 ? `Pending Requests: ${pending}` : "Pending requests: none",
        attendanceLabel: "Attendance: —",
        coreClasses,
        enrichmentClasses,
        events: timeline,
        directoryDataOnly: coreClasses.length === 0 && enrichmentClasses.length === 0 && timeline.length === 0,
      },
    };
  } catch {
    return fallbackProfile(id);
  }
}

export async function fetchStudentScheduleResolved(studentId: string): Promise<StudentScheduleResolved> {
  const id = studentId.trim();
  if (!id) return { rows: [], source: "unavailable" };
  if (!isSupabaseConfigured()) return fallbackSchedule(id);

  try {
    const supabase = await createSupabaseServerClient();
    const { data: student, error } = await supabase
      .from("students")
      .select("id, display_name, guardian_label")
      .eq("id", id)
      .maybeSingle();
    if (error) return fallbackSchedule(id);
    if (!student) return { rows: [], source: "remote" };

    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("enrollments")
      .select("id, status, classes ( id, name, program, block, schedule_summary )")
      .eq("student_id", id)
      .order("created_at", { ascending: true });
    if (enrollmentsError) return fallbackSchedule(id);

    const row = emptyScheduleRow({
      id: String(student.id),
      name: String(student.display_name ?? ""),
      parent: String(student.guardian_label ?? ""),
    });
    ((enrollments ?? []) as unknown as Record<string, unknown>[]).forEach((enrollment, index) => {
      pushBadge(row, scheduleSlotForClass(enrollment, index), badgeForEnrollment(enrollment));
    });
    return { rows: [row], source: "remote" };
  } catch {
    return fallbackSchedule(id);
  }
}

function mapStudentRosterEnrollmentRow(row: Record<string, unknown>): StudentRosterRow | null {
  const student = firstRel<Record<string, unknown>>(row.students);
  const cls = firstRel<Record<string, unknown>>(row.classes);
  const id = student?.id ?? row.student_id;
  if (id == null || String(id) === "") return null;
  const preferenceRaw = row.preference_rank ?? row.preference;
  const preference = Number.isFinite(Number(preferenceRaw)) ? `${Number(preferenceRaw)}${Number(preferenceRaw) === 1 ? "st" : Number(preferenceRaw) === 2 ? "nd" : "th"}` : "";
  return {
    id: String(id),
    name: String(student?.display_name ?? ""),
    parent: String(student?.guardian_label ?? ""),
    age: Number(student?.age_years ?? 0) || 0,
    status: normalizeRosterStatus(row.status),
    avatar: "/images/avatars/student-1.png",
    classId: String(cls?.id ?? row.class_id ?? ""),
    classRef: String(cls?.name ?? ""),
    blockRef: String(cls?.block ?? "Unassigned block"),
    levelRef: String(cls?.level ?? student?.level ?? "Unassigned level"),
    preference: preference || "—",
    notes: String(student?.support_notes ?? student?.learning_profile ?? ""),
  };
}

export async function fetchStudentRosterResolved(studentId: string): Promise<ResolvedList<StudentRosterRow>> {
  const id = studentId.trim();
  if (!id) return { items: [], source: "unavailable" };
  if (!isSupabaseConfigured()) return fallbackRoster();

  try {
    const supabase = await createSupabaseServerClient();
    const { data: ownEnrollments, error: ownError } = await supabase
      .from("enrollments")
      .select("class_id")
      .eq("student_id", id);
    if (ownError) return fallbackRoster();
    const classIds = Array.from(
      new Set(
        ((ownEnrollments ?? []) as { class_id?: string }[])
          .map((row) => row.class_id)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    if (classIds.length === 0) return { items: [], source: "remote" };

    const { data, error } = await supabase
      .from("enrollments")
      .select(
        `
        id,
        status,
        class_id,
        classes ( id, name, block, level ),
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
      .in("class_id", classIds)
      .order("created_at", { ascending: true });
    if (error) return fallbackRoster();

    const mapped = ((data ?? []) as unknown as Record<string, unknown>[])
      .map(mapStudentRosterEnrollmentRow)
      .filter((row): row is StudentRosterRow => row !== null);
    return { items: mapped, source: "remote" };
  } catch {
    return fallbackRoster();
  }
}

export function classRosterStudentsToRosterRows(input: {
  classId: string;
  className: string;
  block: string;
  level: string;
  students: {
    id: string;
    name: string;
    parent: string;
    age: number;
    status: "Approved" | "Pending" | "Waitlisted" | "Rejected";
    description: string;
  }[];
}): StudentRosterRow[] {
  return input.students.map((student) => ({
    id: student.id,
    name: student.name,
    parent: student.parent,
    age: student.age,
    status: student.status === "Approved" ? "Approved" : student.status === "Rejected" || student.status === "Waitlisted" ? "Waitlist" : "Pending",
    avatar: "/images/avatars/student-1.png",
    classId: input.classId,
    classRef: input.className,
    blockRef: input.block || "Unassigned block",
    levelRef: input.level || "Unassigned level",
    preference: "—",
    notes: student.description,
  }));
}
