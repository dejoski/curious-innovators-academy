import type { DataSource, ResolvedList } from "@/lib/data/fetch-source";
import {
  isStudentProfileTimelineEventType,
  type ProgramTrack,
  type StudentProfileBundle,
  type StudentProfileTimelineEventType,
  type StudentProfileTimelineEvent,
  type StudentRosterRow,
  type StudentRosterStatus,
  type StudentScheduleBadge,
  type StudentScheduleRow,
} from "@/lib/data/types";
import { isSupabaseConfigured, unavailableList } from "@/lib/data/env";
import {
  emptyScheduleBadgesBySlot,
  normalizeScheduleBadges,
  scheduleSlotForClassFields,
  type ParentScheduleSlotKey,
} from "@/lib/schedule-slots";
import { firstRel } from "@/lib/data/repositories/relations";
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

function unavailableProfile(): StudentProfileResolved {
  return { profile: null, source: "unavailable" };
}

function unavailableSchedule(): StudentScheduleResolved {
  return { rows: [], source: "unavailable" };
}

function unavailableRoster(): ResolvedList<StudentRosterRow> {
  return unavailableList();
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

function eventTypeFromBody(body: string): StudentProfileTimelineEventType {
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
  const type = isStudentProfileTimelineEventType(category)
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

function badgeForEnrollment(row: Record<string, unknown>): StudentScheduleBadge | null {
  const classRow = firstRel<Record<string, unknown>>(row.classes);
  const program = normalizeProgram(classRow?.program);
  const status = String(row.status ?? "").toLowerCase();
  if (program === "enrichment" && status === "rejected") return null;
  return {
    label: classNameShort(String(classRow?.name ?? "")),
    tone: program === "core" ? "core" : status === "approved" ? "approved" : status === "waitlisted" || status === "waitlist" ? "waitlisted" : "pending",
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
  if (!isSupabaseConfigured()) return unavailableProfile();

  try {
    const supabase = await createSupabaseServerClient();
    const { data: student, error } = await supabase
      .from("students")
      .select(
        "id, display_name, guardian_label, age_years, level, track, learning_profile, strengths, support_notes",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return unavailableProfile();
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
    const activeEnrichmentRows = enrichmentRows.filter((row) => String(row.status ?? "").toLowerCase() !== "rejected");
    const enrichmentClasses = activeEnrichmentRows
      .map((row) => firstRel<Record<string, unknown>>(row.classes))
      .filter((row): row is Record<string, unknown> => row !== null)
      .map((row) => ({ id: String(row.id), name: String(row.name ?? "") }));
    const pending = activeEnrichmentRows.filter((row) => String(row.status ?? "").toLowerCase() !== "approved").length;
    const approved = activeEnrichmentRows.length - pending;
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
        enrichmentSummaryLabel: `Enrichment: ${approved} / ${activeEnrichmentRows.length}`,
        pendingLabel: pending > 0 ? `Pending Requests: ${pending}` : "Pending requests: none",
        attendanceLabel: "Attendance: —",
        coreClasses,
        enrichmentClasses,
        events: timeline,
        directoryDataOnly: coreClasses.length === 0 && enrichmentClasses.length === 0 && timeline.length === 0,
      },
    };
  } catch {
    return unavailableProfile();
  }
}

export async function fetchStudentScheduleResolved(studentId: string): Promise<StudentScheduleResolved> {
  const id = studentId.trim();
  if (!id) return { rows: [], source: "unavailable" };
  if (!isSupabaseConfigured()) return unavailableSchedule();

  try {
    const supabase = await createSupabaseServerClient();
    const { data: student, error } = await supabase
      .from("students")
      .select("id, display_name, guardian_label")
      .eq("id", id)
      .maybeSingle();
    if (error) return unavailableSchedule();
    if (!student) return { rows: [], source: "remote" };

    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("enrollments")
      .select("id, status, classes ( id, name, program, block, schedule_summary )")
      .eq("student_id", id)
      .order("created_at", { ascending: true });
    if (enrollmentsError) return unavailableSchedule();

    const row = emptyScheduleRow({
      id: String(student.id),
      name: String(student.display_name ?? ""),
      parent: String(student.guardian_label ?? ""),
    });
    ((enrollments ?? []) as unknown as Record<string, unknown>[]).forEach((enrollment, index) => {
      const badge = badgeForEnrollment(enrollment);
      if (badge) pushBadge(row, scheduleSlotForClass(enrollment, index), badge);
    });
    row.b1 = normalizeScheduleBadges(row.b1);
    row.b2 = normalizeScheduleBadges(row.b2);
    row.b3Tue = normalizeScheduleBadges(row.b3Tue);
    row.b3Wed = normalizeScheduleBadges(row.b3Wed);
    row.b3Thu = normalizeScheduleBadges(row.b3Thu);
    row.b4Tue = normalizeScheduleBadges(row.b4Tue);
    row.b4Wed = normalizeScheduleBadges(row.b4Wed);
    row.b4Thu = normalizeScheduleBadges(row.b4Thu);
    return { rows: [row], source: "remote" };
  } catch {
    return unavailableSchedule();
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
  if (!isSupabaseConfigured()) return unavailableRoster();

  try {
    const supabase = await createSupabaseServerClient();
    const { data: ownEnrollments, error: ownError } = await supabase
      .from("enrollments")
      .select("class_id")
      .eq("student_id", id);
    if (ownError) return unavailableRoster();
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
    if (error) return unavailableRoster();

    const mapped = ((data ?? []) as unknown as Record<string, unknown>[])
      .map(mapStudentRosterEnrollmentRow)
      .filter((row): row is StudentRosterRow => row !== null);
    return { items: mapped, source: "remote" };
  } catch {
    return unavailableRoster();
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
