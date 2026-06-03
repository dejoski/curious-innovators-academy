import type { DataSource, ResolvedList } from "@/lib/data/fetch-source";
import {
  isStudentProfileTimelineEventType,
  normalizeStudentCompetencyLevels,
  summarizeStudentCompetencyLevels,
  type ProgramTrack,
  type StudentProfileBundle,
  type StudentProfileTimelineEventType,
  type StudentProfileTimelineEvent,
  type StudentRosterRow,
  type StudentRosterStatus,
  type StudentScheduleBadge,
  type StudentScheduleRow,
  type StudentScheduleState,
} from "@/lib/data/types";
import { isSupabaseConfigured, unavailableList } from "@/lib/data/env";
import {
  emptyScheduleBadgesBySlot,
  normalizeScheduleBadges,
  scheduleSlotForClassFields,
  type ParentScheduleSlotKey,
} from "@/lib/schedule-slots";
import { requireAdminReadClient, type AdminReadClient } from "@/lib/api/admin-read";
import { parentContactFromStudentRow, STUDENT_PARENT_CONTACT_SELECT } from "@/lib/data/parent-contact";
import { firstRel } from "@/lib/data/repositories/relations";
import { fetchCurrentSemesterResolved } from "@/lib/data/repositories/semesters";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type StudentReadClient = Pick<
  Awaited<ReturnType<typeof createSupabaseServerClient>> | AdminReadClient,
  "from"
>;

type StudentProfileResolved = {
  profile: StudentProfileBundle | null;
  source: DataSource;
};

type StudentScheduleResolved = {
  rows: StudentScheduleRow[];
  source: DataSource;
};
type StudentScheduleQueryOptions = { semesterId?: string | null };

const SCHOOL_TIME_ZONE = "America/New_York";

function logStudentDetailsRepoIssue(
  context: string,
  studentId: string,
  table: string,
  error: unknown,
) {
  console.error(`[student-details] ${context}: ${table} query failed`, {
    studentId,
    table,
    context,
    error: String(error ?? "(none)"),
  });
}

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

async function resolveSemesterFilter(client: StudentReadClient, options?: StudentScheduleQueryOptions): Promise<string | null> {
  const explicit = options?.semesterId?.trim();
  if (explicit) return explicit;
  const { semester } = await fetchCurrentSemesterResolved(client);
  return semester?.id ?? null;
}

function rowMatchesSemester(row: Record<string, unknown>, semesterId: string | null): boolean {
  if (!semesterId) return true;
  const classRow = firstRel<Record<string, unknown>>(row.classes);
  if (!("semester_id" in (classRow ?? {}))) return true;
  return String(classRow?.semester_id ?? "") === semesterId;
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

const DAILY_SCHEDULE_KEYS = [
  "b1Tue",
  "b2Tue",
  "b3Tue",
  "b4Tue",
  "b1Wed",
  "b2Wed",
  "b3Wed",
  "b4Wed",
  "b1Thu",
  "b2Thu",
  "b3Thu",
  "b4Thu",
] as const;

function normalizeScheduleState(raw: unknown): StudentScheduleState {
  const value = String(raw ?? "").toLowerCase();
  if (value === "finalized") return "finalized";
  if (value === "pending") return "pending";
  return "draft";
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
  scheduleState?: StudentScheduleState;
  finalizedBy?: string;
  finalizedAt?: string;
}): StudentScheduleRow {
  const empty = emptyScheduleBadgesBySlot();
  return {
    id: input.id,
    name: input.name,
    parent: input.parent,
    avatar: input.avatar || "/images/avatars/student-1.png",
    scheduleState: input.scheduleState ?? "draft",
    finalizedBy: input.finalizedBy,
    finalizedAt: input.finalizedAt,
    hasConflicts: false,
    incompleteBlocks: DAILY_SCHEDULE_KEYS.length,
    b1: empty.b1,
    b1Tue: empty.b1Tue,
    b1Wed: empty.b1Wed,
    b1Thu: empty.b1Thu,
    b2: empty.b2,
    b2Tue: empty.b2Tue,
    b2Wed: empty.b2Wed,
    b2Thu: empty.b2Thu,
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
  if (program === "core" && status !== "approved") return null;
  if (program === "enrichment" && status === "rejected") return null;
  const badge: StudentScheduleBadge = {
    label: classNameShort(String(classRow?.name ?? "")),
    classId: String(classRow?.id ?? ""),
    tone: program === "core" ? "core" : status === "approved" ? "approved" : status === "waitlisted" || status === "waitlist" ? "waitlisted" : "pending",
  };
  if (program === "enrichment" && status === "pending" && row.id != null) {
    badge.requestId = String(row.id);
  }
  return badge;
}

function pushBadge(row: StudentScheduleRow, slot: ParentScheduleSlotKey, badge: StudentScheduleBadge) {
  if (slot === "b1") {
    pushBadge(row, "b1Tue", badge);
    pushBadge(row, "b1Wed", badge);
    pushBadge(row, "b1Thu", badge);
    row.b1 = row.b1.filter((item) => item.tone !== "empty");
    row.b1.push(badge);
    return;
  }
  if (slot === "b2") {
    pushBadge(row, "b2Tue", badge);
    pushBadge(row, "b2Wed", badge);
    pushBadge(row, "b2Thu", badge);
    row.b2 = row.b2.filter((item) => item.tone !== "empty");
    row.b2.push(badge);
    return;
  }
  const current = row[slot];
  const next = current.filter((item) => item.tone !== "empty");
  next.push(badge);
  row[slot] = next;
}

function realBadges(badges: StudentScheduleBadge[] | undefined) {
  return (badges ?? []).filter((badge) => badge.tone !== "empty" && badge.label !== "--");
}

function finalizeScheduleDiagnostics(row: StudentScheduleRow) {
  let incompleteBlocks = 0;
  let hasConflicts = false;
  for (const key of DAILY_SCHEDULE_KEYS) {
    const badges = realBadges(row[key]);
    if (badges.length === 0) incompleteBlocks += 1;
    if (badges.filter((badge) => badge.tone === "approved" || badge.tone === "core").length > 1) {
      hasConflicts = true;
    }
  }
  row.incompleteBlocks = incompleteBlocks;
  row.hasConflicts = hasConflicts;
  if (row.scheduleState !== "finalized" && incompleteBlocks === 0 && !hasConflicts) {
    row.scheduleState = realBadges(DAILY_SCHEDULE_KEYS.flatMap((key) => row[key])).some((badge) => badge.tone === "pending")
      ? "pending"
      : row.scheduleState;
  }
}

function applyScheduleState(row: StudentScheduleRow, stateRow: Record<string, unknown> | undefined) {
  if (!stateRow) return;
  row.scheduleState = normalizeScheduleState(stateRow.state);
  row.finalizedAt = String(stateRow.finalized_at ?? "").trim() || undefined;
  const finalizer = firstRel<Record<string, unknown>>(stateRow.profiles);
  row.finalizedBy = String(finalizer?.display_name ?? "").trim() || undefined;
}

export async function fetchStudentProfileResolved(
  studentId: string,
  client?: StudentReadClient,
): Promise<StudentProfileResolved> {
  const id = studentId.trim();
  if (!id) return { profile: null, source: "unavailable" };
  if (!isSupabaseConfigured()) return unavailableProfile();

  try {
    const supabase = client ?? await createSupabaseServerClient();
    const { data: student, error } = await supabase
      .from("students")
      .select(
        `id, display_name, guardian_label, avatar_url, age_years, level, track, learning_profile, strengths, support_notes, student_competency_levels ( competency, level, behavior ), ${STUDENT_PARENT_CONTACT_SELECT}`,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      logStudentDetailsRepoIssue("fetchStudentProfileResolved", id, "students", error);
      return unavailableProfile();
    }
    if (!student) return { profile: null, source: "remote" };
    const semesterId = await resolveSemesterFilter(supabase);

    const [enrollmentsResult, classRequestsResult, recordsResult] = await Promise.all([
      supabase
        .from("enrollments")
        .select("id, status, classes ( id, name, program )")
        .eq("student_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("class_requests")
        .select("id, status, classes ( id, name, program )")
        .eq("student_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("student_records")
        .select("id, title, body, category, urgent, created_at, profiles ( display_name, role )")
        .eq("student_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    const { data: enrollments, error: enrollmentsError } = enrollmentsResult;
    if (enrollmentsError) {
      logStudentDetailsRepoIssue("fetchStudentProfileResolved", id, "enrollments", enrollmentsError);
    }

    const { data: classRequests, error: classRequestsError } = classRequestsResult;
    if (classRequestsError) {
      logStudentDetailsRepoIssue("fetchStudentProfileResolved", id, "class_requests", classRequestsError);
    }

    const { data: records, error: recordsError } = recordsResult;
    if (recordsError) {
      logStudentDetailsRepoIssue("fetchStudentProfileResolved", id, "student_records", recordsError);
    }

    const enrollmentRows = ((enrollments ?? []) as unknown as Record<string, unknown>[])
      .filter((row) => rowMatchesSemester(row, semesterId));
    const requestRows = ((classRequests ?? []) as unknown as Record<string, unknown>[])
      .filter((row) => rowMatchesSemester(row, semesterId));
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
    const pending = requestRows.filter((row) => {
      const cls = firstRel<Record<string, unknown>>(row.classes);
      return normalizeProgram(cls?.program) === "enrichment" && String(row.status ?? "").toLowerCase() === "pending";
    }).length;
    const approved = activeEnrichmentRows.filter((row) => String(row.status ?? "").toLowerCase() === "approved").length;
    const enrichmentTotal = activeEnrichmentRows.length + pending;
    const timeline = ((records ?? []) as unknown as Record<string, unknown>[])
      .map(mapStudentRecord)
      .filter((row): row is StudentProfileTimelineEvent => row !== null);
    const competencyLevels = normalizeStudentCompetencyLevels((student as Record<string, unknown>).student_competency_levels);
    const legacyLevel = String(student.level ?? "");

    const parentContact = parentContactFromStudentRow(student as unknown as Record<string, unknown>);

    return {
      source: "remote",
      profile: {
        avatar: String(student.avatar_url ?? "") || "/images/avatars/student-1.png",
        details: {
          name: String(student.display_name ?? ""),
          age: student.age_years == null ? "—" : String(student.age_years),
          level: summarizeStudentCompetencyLevels(competencyLevels, legacyLevel),
          competencyLevels,
          learningProfile: String(student.learning_profile ?? "") || "—",
          strengths: String(student.strengths ?? "") || "—",
          supportNotes: String(student.support_notes ?? "") || "—",
        },
        parentName: parentContact.name,
        parentContacts: parentContact.names.length || parentContact.emails.length
          ? parentContact.names.map((name, index) => ({
              id: parentContact.parentIds[index],
              name,
              email: parentContact.emails[index],
            }))
          : [{
              id: parentContact.parentIds[0],
              name: parentContact.name || "Parent contact",
              email: parentContact.email || undefined,
            }],
        parentHref: "/dashboard/parents",
        coreSummaryLabel: `Core: ${coreClasses.length}`,
        enrichmentSummaryLabel: `Enrichment: ${approved} / ${enrichmentTotal}`,
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

export async function fetchAdminStudentProfileResolved(
  studentId: string,
): Promise<StudentProfileResolved> {
  const access = await requireAdminReadClient();
  if (!access) return unavailableProfile();
  return fetchStudentProfileResolved(studentId, access.client);
}

export async function fetchAdminStudentSchedulesResolved(options?: StudentScheduleQueryOptions): Promise<StudentScheduleResolved> {
  if (!isSupabaseConfigured()) return unavailableSchedule();
  const access = await requireAdminReadClient();
  if (!access) return unavailableSchedule();

  try {
    const supabase = access.client;
    const semesterId = await resolveSemesterFilter(supabase, options);
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select(`id, display_name, guardian_label, avatar_url, ${STUDENT_PARENT_CONTACT_SELECT}`)
      .order("display_name", { ascending: true });
    if (studentsError) {
      logStudentDetailsRepoIssue("fetchAdminStudentSchedulesResolved", "all", "students", studentsError);
      return unavailableSchedule();
    }

    const rows = ((students ?? []) as unknown as Record<string, unknown>[]).map((student) =>
      emptyScheduleRow({
        id: String(student.id ?? ""),
        name: String(student.display_name ?? ""),
        parent: parentContactFromStudentRow(student as unknown as Record<string, unknown>).name,
        avatar: String(student.avatar_url ?? ""),
      }),
    ).filter((row) => row.id);
    const byStudentId = new Map(rows.map((row) => [row.id, row]));

    const [scheduleStatesResult, enrollmentsResult] = await Promise.all([
      semesterId
        ? supabase
            .from("student_schedule_states")
            .select("student_id, state, finalized_at, profiles:finalized_by ( display_name )")
            .eq("semester_id", semesterId)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("enrollments")
        .select("id, status, student_id, classes ( id, name, program, block, schedule_summary )")
        .order("created_at", { ascending: true }),
    ]);
    const { data: enrollments, error: enrollmentsError } = enrollmentsResult;
    const scheduleStateRows = new Map(
      ((scheduleStatesResult.data ?? []) as unknown as Record<string, unknown>[]).map((row) => [String(row.student_id ?? ""), row]),
    );
    rows.forEach((row) => applyScheduleState(row, scheduleStateRows.get(row.id)));
    if (scheduleStatesResult.error) {
      logStudentDetailsRepoIssue("fetchAdminStudentSchedulesResolved", "all", "student_schedule_states", scheduleStatesResult.error);
    }
    if (enrollmentsError) {
      logStudentDetailsRepoIssue("fetchAdminStudentSchedulesResolved", "all", "enrollments", enrollmentsError);
      return unavailableSchedule();
    }

    const { data: classRequests, error: classRequestsError } = await supabase
      .from("class_requests")
      .select("id, status, student_id, classes ( id, name, program, block, schedule_summary )")
      .order("created_at", { ascending: true });
    if (classRequestsError) {
      logStudentDetailsRepoIssue("fetchAdminStudentSchedulesResolved", "all", "class_requests", classRequestsError);
      return unavailableSchedule();
    }

    ((enrollments ?? []) as unknown as Record<string, unknown>[])
      .filter((row) => rowMatchesSemester(row, semesterId))
      .forEach((enrollment, index) => {
      const studentId = String(enrollment.student_id ?? "");
      const row = byStudentId.get(studentId);
      const badge = badgeForEnrollment(enrollment);
      if (row && badge) pushBadge(row, scheduleSlotForClass(enrollment, index), badge);
    });

    ((classRequests ?? []) as unknown as Record<string, unknown>[])
      .filter((row) => rowMatchesSemester(row, semesterId))
      .forEach((request, index) => {
      if (String(request.status ?? "").toLowerCase() !== "pending") return;
      const studentId = String(request.student_id ?? "");
      const row = byStudentId.get(studentId);
      const badge = badgeForEnrollment(request);
      if (row && badge) pushBadge(row, scheduleSlotForClass(request, index), badge);
    });

    rows.forEach((row) => {
      row.b1 = normalizeScheduleBadges(row.b1);
      row.b1Tue = normalizeScheduleBadges(row.b1Tue);
      row.b1Wed = normalizeScheduleBadges(row.b1Wed);
      row.b1Thu = normalizeScheduleBadges(row.b1Thu);
      row.b2 = normalizeScheduleBadges(row.b2);
      row.b2Tue = normalizeScheduleBadges(row.b2Tue);
      row.b2Wed = normalizeScheduleBadges(row.b2Wed);
      row.b2Thu = normalizeScheduleBadges(row.b2Thu);
      row.b3Tue = normalizeScheduleBadges(row.b3Tue);
      row.b3Wed = normalizeScheduleBadges(row.b3Wed);
      row.b3Thu = normalizeScheduleBadges(row.b3Thu);
      row.b4Tue = normalizeScheduleBadges(row.b4Tue);
      row.b4Wed = normalizeScheduleBadges(row.b4Wed);
      row.b4Thu = normalizeScheduleBadges(row.b4Thu);
      finalizeScheduleDiagnostics(row);
    });

    return { rows, source: "remote" };
  } catch {
    return unavailableSchedule();
  }
}

export async function fetchStudentScheduleResolved(
  studentId: string,
  client?: StudentReadClient,
  options?: StudentScheduleQueryOptions,
): Promise<StudentScheduleResolved> {
  const id = studentId.trim();
  if (!id) return { rows: [], source: "unavailable" };
  if (!isSupabaseConfigured()) return unavailableSchedule();

  try {
    const supabase = client ?? await createSupabaseServerClient();
    const semesterId = await resolveSemesterFilter(supabase, options);
    const { data: student, error } = await supabase
      .from("students")
      .select(`id, display_name, guardian_label, avatar_url, ${STUDENT_PARENT_CONTACT_SELECT}`)
      .eq("id", id)
      .maybeSingle();
    if (error) {
      logStudentDetailsRepoIssue("fetchStudentScheduleResolved", id, "students", error);
      return unavailableSchedule();
    }
    if (!student) return { rows: [], source: "remote" };

    const [scheduleStateResult, enrollmentsResult, classRequestsResult] = await Promise.all([
      semesterId
        ? supabase
            .from("student_schedule_states")
            .select("student_id, state, finalized_at, profiles:finalized_by ( display_name )")
            .eq("student_id", id)
            .eq("semester_id", semesterId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("enrollments")
        .select("id, status, classes ( id, name, program, block, schedule_summary )")
        .eq("student_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("class_requests")
        .select("id, status, classes ( id, name, program, block, schedule_summary )")
        .eq("student_id", id)
        .order("created_at", { ascending: true }),
    ]);
    const { data: enrollments, error: enrollmentsError } = enrollmentsResult;
    if (enrollmentsError) {
      logStudentDetailsRepoIssue("fetchStudentScheduleResolved", id, "enrollments", enrollmentsError);
      return unavailableSchedule();
    }

    const { data: classRequests, error: classRequestsError } = classRequestsResult;
    if (classRequestsError) {
      logStudentDetailsRepoIssue("fetchStudentScheduleResolved", id, "class_requests", classRequestsError);
      return unavailableSchedule();
    }

    const row = emptyScheduleRow({
      id: String(student.id),
      name: String(student.display_name ?? ""),
      parent: parentContactFromStudentRow(student as unknown as Record<string, unknown>).name,
      avatar: String(student.avatar_url ?? ""),
    });
    if (scheduleStateResult.error) {
      logStudentDetailsRepoIssue("fetchStudentScheduleResolved", id, "student_schedule_states", scheduleStateResult.error);
    } else {
      applyScheduleState(row, (scheduleStateResult.data ?? undefined) as Record<string, unknown> | undefined);
    }
    ((enrollments ?? []) as unknown as Record<string, unknown>[])
      .filter((row) => rowMatchesSemester(row, semesterId))
      .forEach((enrollment, index) => {
      const badge = badgeForEnrollment(enrollment);
      if (badge) pushBadge(row, scheduleSlotForClass(enrollment, index), badge);
    });
    ((classRequests ?? []) as unknown as Record<string, unknown>[])
      .filter((row) => rowMatchesSemester(row, semesterId))
      .forEach((request, index) => {
      const status = String(request.status ?? "").toLowerCase();
      if (status !== "pending") return;
      const badge = badgeForEnrollment(request);
      if (badge) pushBadge(row, scheduleSlotForClass(request, index), badge);
    });
    row.b1 = normalizeScheduleBadges(row.b1);
    row.b1Tue = normalizeScheduleBadges(row.b1Tue);
    row.b1Wed = normalizeScheduleBadges(row.b1Wed);
    row.b1Thu = normalizeScheduleBadges(row.b1Thu);
    row.b2 = normalizeScheduleBadges(row.b2);
    row.b2Tue = normalizeScheduleBadges(row.b2Tue);
    row.b2Wed = normalizeScheduleBadges(row.b2Wed);
    row.b2Thu = normalizeScheduleBadges(row.b2Thu);
    row.b3Tue = normalizeScheduleBadges(row.b3Tue);
    row.b3Wed = normalizeScheduleBadges(row.b3Wed);
    row.b3Thu = normalizeScheduleBadges(row.b3Thu);
    row.b4Tue = normalizeScheduleBadges(row.b4Tue);
    row.b4Wed = normalizeScheduleBadges(row.b4Wed);
    row.b4Thu = normalizeScheduleBadges(row.b4Thu);
    finalizeScheduleDiagnostics(row);
    return { rows: [row], source: "remote" };
  } catch {
    return unavailableSchedule();
  }
}

export async function fetchAdminStudentScheduleResolved(
  studentId: string,
  options?: StudentScheduleQueryOptions,
): Promise<StudentScheduleResolved> {
  const access = await requireAdminReadClient();
  if (!access) return unavailableSchedule();
  return fetchStudentScheduleResolved(studentId, access.client, options);
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
    parent: parentContactFromStudentRow(student).name,
    age: Number(student?.age_years ?? 0) || 0,
    status: normalizeRosterStatus(row.status),
    avatar: String(student?.avatar_url ?? "") || "/images/avatars/student-1.png",
    classId: String(cls?.id ?? row.class_id ?? ""),
    classRef: String(cls?.name ?? ""),
    blockRef: String(cls?.block ?? "Unassigned block"),
    levelRef: String(cls?.level ?? student?.level ?? "Unassigned level"),
    preference: preference || "—",
    notes: String(student?.support_notes ?? student?.learning_profile ?? ""),
  };
}

export async function fetchStudentRosterResolved(
  studentId: string,
  client?: StudentReadClient,
): Promise<ResolvedList<StudentRosterRow>> {
  const id = studentId.trim();
  if (!id) return { items: [], source: "unavailable" };
  if (!isSupabaseConfigured()) return unavailableRoster();

  try {
    const supabase = client ?? await createSupabaseServerClient();
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
          ${STUDENT_PARENT_CONTACT_SELECT},
          avatar_url,
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

export async function fetchAdminStudentRosterResolved(
  studentId: string,
): Promise<ResolvedList<StudentRosterRow>> {
  const access = await requireAdminReadClient();
  if (!access) return unavailableRoster();
  return fetchStudentRosterResolved(studentId, access.client);
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
