import type { DataSource, ResolvedList } from "@/lib/data/fetch-source";
import { isStudentProfileTimelineEventType } from "@/lib/data/types";
import type {
  ProgramTrack,
  ScheduleConflict,
  StudentProfileBundle,
  StudentProfileTimelineEventType,
  StudentProfileTimelineEvent,
  StudentRosterRow,
  StudentRosterStatus,
  StudentScheduleBadge,
  StudentScheduleRow,
  StudentScheduleState,
} from "@/lib/data/types";
import { isSupabaseConfigured, unavailableList } from "@/lib/data/env";
import {
  emptyScheduleBadgesBySlot,
  normalizeScheduleBadges,
  scheduleSlotForClassFields,
  type ParentScheduleSlotKey,
} from "@/lib/schedule-slots";
import {
  competencyBlockDisplayName,
  competencyMappingKey,
  scheduleSlotsForCompetencyBlock,
  type CompetencyBlockMapping,
} from "@/lib/competency-block-mappings";
import { fetchCompetencyBlockMappingsForLevels } from "@/lib/data/repositories/competency-block-mappings";
import {
  DAILY_SCHEDULE_KEYS,
  applyTeacherConflictDiagnostics,
  type ActiveTeacherConflictOverride,
} from "@/lib/data/repositories/schedule-diagnostics";
import { recordStudentScheduleSnapshot } from "@/lib/data/repositories/history";
import { normalizeStudentCompetencyLevels, summarizeStudentCompetencyLevels } from "@/lib/data/repositories/students";
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

async function writeScheduleStateAuditEvent(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  input: {
    studentId: string;
    semesterId: string;
    state: StudentScheduleState;
    finalizedBy: string | null;
    finalizedAt: string | null;
  },
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return;
    await supabase.from("audit_events").insert({
      actor_profile_id: user.id,
      action: "student_schedule_state.update",
      entity_type: "student",
      entity_id: input.studentId,
      metadata: {
        semesterId: input.semesterId,
        state: input.state,
        finalizedBy: input.finalizedBy,
        finalizedAt: input.finalizedAt,
      },
    });
  } catch {
    /* Audit writes should not block schedule state changes. */
  }
}

async function writeScheduleConflictOverrideAuditEvent(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  input: {
    studentId: string;
    teacherId: string;
    slot: string;
    classIds: string[];
    overrideId: string;
    reason?: string | null;
  },
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return;
    await supabase.from("audit_events").insert({
      actor_profile_id: user.id,
      action: "schedule_conflict.override",
      entity_type: "teacher_conflict_override",
      entity_id: input.overrideId,
      metadata: {
        studentId: input.studentId,
        teacherId: input.teacherId,
        slot: input.slot,
        classIds: input.classIds,
        reason: input.reason ?? null,
      },
    });
  } catch {
    /* Audit writes should not block schedule override changes. */
  }
}

function uniqueNonEmpty(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function possessiveName(name: string): string {
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

async function selectParentNotificationRecipientProfileIds(
  client: StudentReadClient,
  studentId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("parent_students")
    .select("parents ( profile_id )")
    .eq("student_id", studentId);
  if (error) return [];

  return uniqueNonEmpty(((data ?? []) as unknown as Record<string, unknown>[]).map((row) => {
    const parent = firstRel<Record<string, unknown>>(row.parents);
    return String(parent?.profile_id ?? "");
  }));
}

async function insertNotificationsIfPossible(
  client: StudentReadClient,
  rows: { recipient_profile_id: string; title: string; body: string; href: string }[],
) {
  const payload = rows.filter((row) => row.recipient_profile_id && row.title && row.body);
  if (payload.length === 0) return;
  try {
    await client.from("notifications").insert(payload);
  } catch {
    /* Notification writes should not block schedule state changes. */
  }
}

async function insertUnreadNotificationsIfAbsent(
  client: StudentReadClient,
  rows: { recipient_profile_id: string; title: string; body: string; href: string }[],
) {
  const payload = rows.filter((row) => row.recipient_profile_id && row.title && row.body);
  if (payload.length === 0) return;
  try {
    const missing: typeof payload = [];
    for (const row of payload) {
      const { data, error } = await client
        .from("notifications")
        .select("id")
        .eq("recipient_profile_id", row.recipient_profile_id)
        .eq("title", row.title)
        .eq("href", row.href)
        .eq("body", row.body)
        .is("read_at", null)
        .limit(1);
      if (!error && (data?.length ?? 0) === 0) missing.push(row);
    }
    if (missing.length > 0) await client.from("notifications").insert(missing);
  } catch {
    /* Notification writes should not block schedule state changes. */
  }
}

async function selectAdminNotificationRecipientProfileIds(
  client: StudentReadClient,
): Promise<string[]> {
  const { data, error } = await client
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  if (error) return [];
  return uniqueNonEmpty(((data ?? []) as { id?: unknown }[]).map((row) => String(row.id ?? "")));
}

async function writeScheduleAttentionNotifications(
  client: StudentReadClient,
  row: StudentScheduleRow,
) {
  const adminIds = await selectAdminNotificationRecipientProfileIds(client);
  if (adminIds.length === 0) return;
  const href = `/dashboard/students/${row.id}/schedule`;
  const student = row.name.trim() || "A student";
  const notifications: { recipient_profile_id: string; title: string; body: string; href: string }[] = [];
  if (row.scheduleState !== "finalized" && (row.incompleteBlocks ?? 0) > 0) {
    const body = `${student} has ${row.incompleteBlocks} incomplete schedule block${row.incompleteBlocks === 1 ? "" : "s"} needing admin action.`;
    notifications.push(...adminIds.map((recipientProfileId) => ({
      recipient_profile_id: recipientProfileId,
      title: "Schedule action needed",
      body,
      href,
    })));
  }
  if ((row.conflicts ?? []).length > 0) {
    const body = `${student} has ${row.conflicts?.length ?? 0} schedule conflict${(row.conflicts?.length ?? 0) === 1 ? "" : "s"} needing review.`;
    notifications.push(...adminIds.map((recipientProfileId) => ({
      recipient_profile_id: recipientProfileId,
      title: "Schedule conflict detected",
      body,
      href,
    })));
  }
  await insertUnreadNotificationsIfAbsent(client, notifications);
}

async function writeStudentScheduleFinalizedNotifications(
  client: StudentReadClient,
  input: { studentId: string; studentName: string },
) {
  const recipientIds = await selectParentNotificationRecipientProfileIds(client, input.studentId);
  const studentName = input.studentName.trim() || "Your child";
  await insertNotificationsIfPossible(client, recipientIds.map((recipientProfileId) => ({
    recipient_profile_id: recipientProfileId,
    title: "Schedule finalized",
    body: `${possessiveName(studentName)} schedule has been finalized.`,
    href: "/dashboard/parents/home",
  })));
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

function studentConflictRecord(): ScheduleConflict {
  return {
    kind: "student",
    label: "Student conflict",
    detail: "This schedule has overlapping confirmed placements in the same block.",
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
  const teacherRel = firstRel<Record<string, unknown>>(classRow?.teachers);
  const teacherProfile = firstRel<Record<string, unknown>>(teacherRel?.profiles);
  const program = normalizeProgram(classRow?.program);
  const status = String(row.status ?? "").toLowerCase();
  if (program === "core" && status !== "approved") return null;
  if (program === "enrichment" && status === "rejected") return null;
  const badge: StudentScheduleBadge = {
    label: classNameShort(String(classRow?.name ?? "")),
    classId: String(classRow?.id ?? ""),
    teacherId: String(classRow?.teacher_id ?? "").trim() || undefined,
    teacher: String(teacherProfile?.display_name ?? "").trim() || undefined,
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

function mappingsForCompetencyLevels(
  levels: ReturnType<typeof normalizeStudentCompetencyLevels>,
  mappings: CompetencyBlockMapping[],
): CompetencyBlockMapping[] {
  const wanted = new Set(levels.map((level) => competencyMappingKey(level.competency as "reading" | "math", level.level)));
  return mappings.filter((mapping) => wanted.has(competencyMappingKey(mapping.competency, mapping.level)));
}

function applyCompetencyBlockPlaceholders(
  row: StudentScheduleRow,
  levels: ReturnType<typeof normalizeStudentCompetencyLevels>,
  mappings: CompetencyBlockMapping[],
) {
  const matched = mappingsForCompetencyLevels(levels, mappings);
  for (const mapping of matched) {
    for (const slot of scheduleSlotsForCompetencyBlock(mapping.blockNumber)) {
      if (realBadges(row[slot]).length > 0) continue;
      pushBadge(row, slot, {
        label: competencyBlockDisplayName(mapping.competency, mapping.level),
        tone: "core",
      });
    }
  }
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
  row.conflicts = [];
  if (hasConflicts) {
    row.conflicts.push(studentConflictRecord());
  }
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

async function fetchActiveTeacherConflictOverrides(
  client: StudentReadClient,
): Promise<ActiveTeacherConflictOverride[]> {
  const { data, error } = await client
    .from("teacher_conflict_overrides")
    .select("id, teacher_id, slot, class_ids")
    .eq("active", true);
  if (error) return [];
  return ((data ?? []) as unknown as Record<string, unknown>[])
    .map((row) => ({
      id: String(row.id ?? "").trim(),
      teacherId: String(row.teacher_id ?? "").trim(),
      slot: String(row.slot ?? "").trim(),
      classIds: Array.isArray(row.class_ids)
        ? row.class_ids.map((value) => String(value ?? "").trim()).filter(Boolean)
        : [],
    }))
    .filter((row) => row.id && row.teacherId && row.slot && row.classIds.length >= 2);
}

async function fetchStudentScheduleStateGuardrails(
  studentId: string,
  client: StudentReadClient,
  options?: StudentScheduleQueryOptions,
): Promise<{ ok: true; row: StudentScheduleRow } | { ok: false; message: string }> {
  const schedule = await fetchStudentScheduleResolved(studentId, client, options);
  const row = schedule.rows[0];
  if (!row) return { ok: false, message: "Student schedule could not be loaded." };
  return { ok: true, row };
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
        `id, display_name, guardian_label, avatar_url, age_years, level, track, learning_profile, strengths, support_notes, ${STUDENT_PARENT_CONTACT_SELECT}, student_competency_levels ( competency, level, behavior )`,
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
        parentContacts: parentContact.contacts.length
          ? parentContact.contacts
          : [{
              id: parentContact.parentIds[0],
              name: parentContact.name || "Parent contact",
              email: parentContact.email || undefined,
              phone: parentContact.phones[0] || undefined,
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
      .select(`id, display_name, guardian_label, avatar_url, ${STUDENT_PARENT_CONTACT_SELECT}, student_competency_levels ( competency, level, behavior )`)
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
    const studentCompetencyLevelsById = new Map(
      ((students ?? []) as unknown as Record<string, unknown>[]).map((student) => [
        String(student.id ?? ""),
        normalizeStudentCompetencyLevels(student.student_competency_levels),
      ]),
    );
    const competencyMappings = await fetchCompetencyBlockMappingsForLevels(
      Array.from(studentCompetencyLevelsById.values()).flat(),
    );

    const [scheduleStatesResult, enrollmentsResult] = await Promise.all([
      semesterId
        ? supabase
            .from("student_schedule_states")
            .select("student_id, state, finalized_at, profiles:finalized_by ( display_name )")
            .eq("semester_id", semesterId)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("enrollments")
        .select("id, status, student_id, classes ( id, name, program, block, schedule_summary, teacher_id, teachers ( profiles ( display_name ) ) )")
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
      .select("id, status, student_id, classes ( id, name, program, block, schedule_summary, teacher_id, teachers ( profiles ( display_name ) ) )")
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

    const activeTeacherOverrides = await fetchActiveTeacherConflictOverrides(supabase);

    rows.forEach((row) => {
      applyCompetencyBlockPlaceholders(row, studentCompetencyLevelsById.get(row.id) ?? [], competencyMappings);
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
    applyTeacherConflictDiagnostics(rows, activeTeacherOverrides);

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
      .select(`id, display_name, guardian_label, avatar_url, ${STUDENT_PARENT_CONTACT_SELECT}, student_competency_levels ( competency, level, behavior )`)
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
        .select("id, status, classes ( id, name, program, block, schedule_summary, teacher_id, teachers ( profiles ( display_name ) ) )")
        .eq("student_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("class_requests")
        .select("id, status, classes ( id, name, program, block, schedule_summary, teacher_id, teachers ( profiles ( display_name ) ) )")
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
    const competencyLevels = normalizeStudentCompetencyLevels((student as Record<string, unknown>).student_competency_levels);
    const competencyMappings = await fetchCompetencyBlockMappingsForLevels(competencyLevels);
    const activeTeacherOverrides = await fetchActiveTeacherConflictOverrides(supabase);
    applyCompetencyBlockPlaceholders(row, competencyLevels, competencyMappings);
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
    applyTeacherConflictDiagnostics([row], activeTeacherOverrides);
    return { rows: [row], source: "remote" };
  } catch {
    return unavailableSchedule();
  }
}

export async function updateStudentScheduleStateResolved(
  studentId: string,
  state: StudentScheduleState,
  options?: StudentScheduleQueryOptions & { finalizedByProfileId?: string | null },
): Promise<
  | { ok: true; rows: StudentScheduleRow[]; source: DataSource }
  | { ok: false; message: string }
> {
  const id = studentId.trim();
  if (!id) return { ok: false, message: "Student id is required." };
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };

  try {
    const supabase = await createSupabaseServerClient();
    const semesterId = await resolveSemesterFilter(supabase, options);
    if (!semesterId) {
      return { ok: false, message: "No active semester could be resolved." };
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (studentError) {
      logStudentDetailsRepoIssue("updateStudentScheduleStateResolved", id, "students", studentError);
      return { ok: false, message: studentError.message };
    }
    if (!student) return { ok: false, message: "Selected student was not found." };

    const normalizedState = normalizeScheduleState(state);
    let previousScheduleState: StudentScheduleState | null = null;
    const { data: previousStateRow, error: previousStateError } = await supabase
      .from("student_schedule_states")
      .select("state")
      .eq("student_id", id)
      .eq("semester_id", semesterId)
      .maybeSingle();
    if (previousStateError) {
      logStudentDetailsRepoIssue("updateStudentScheduleStateResolved", id, "student_schedule_states", previousStateError);
    } else if (previousStateRow) {
      previousScheduleState = normalizeScheduleState((previousStateRow as Record<string, unknown>).state);
    }

    if (normalizedState === "finalized") {
      const guardrails = await fetchStudentScheduleStateGuardrails(id, supabase, { semesterId });
      if (!guardrails.ok) return guardrails;
      if ((guardrails.row.incompleteBlocks ?? 0) > 0) {
        return {
          ok: false,
          message: `This schedule still has ${guardrails.row.incompleteBlocks} open block${guardrails.row.incompleteBlocks === 1 ? "" : "s"} and cannot be finalized yet.`,
        };
      }
      const blockingConflicts = (guardrails.row.conflicts ?? []).filter((conflict) =>
        conflict.kind !== "teacher" || !conflict.overrideRecorded,
      );
      if (blockingConflicts.length > 0) {
        return { ok: false, message: "This schedule has a conflict and cannot be finalized until the conflict is resolved." };
      }
    }

    const finalizedAt = normalizedState === "finalized" ? new Date().toISOString() : null;
    const finalizedBy = normalizedState === "finalized" ? String(options?.finalizedByProfileId ?? "").trim() || null : null;
    const { error: writeError } = await supabase
      .from("student_schedule_states")
      .upsert(
        {
          student_id: id,
          semester_id: semesterId,
          state: normalizedState,
          finalized_by: finalizedBy,
          finalized_at: finalizedAt,
        },
        { onConflict: "student_id,semester_id" },
      );
    if (writeError) {
      logStudentDetailsRepoIssue("updateStudentScheduleStateResolved", id, "student_schedule_states", writeError);
      return { ok: false, message: writeError.message };
    }
    await writeScheduleStateAuditEvent(supabase, {
      studentId: id,
      semesterId,
      state: normalizedState,
      finalizedBy,
      finalizedAt,
    });

    const refreshed = await fetchStudentScheduleResolved(id, supabase, { semesterId });
    const finalizedRow = refreshed.rows[0];
    if (finalizedRow) {
      const snapshot = await recordStudentScheduleSnapshot(finalizedRow, supabase, {
        semesterId,
        recordedByProfileId: String(options?.finalizedByProfileId ?? "").trim() || finalizedBy,
        reason: "Schedule state updated",
        sourceAction: "student_schedule_state.update",
        sourceEntityType: "student",
        sourceEntityId: id,
      });
      if (!snapshot.ok) return { ok: false, message: snapshot.message };
      await writeScheduleAttentionNotifications(supabase, finalizedRow);
    }
    if (normalizedState === "finalized" && previousScheduleState !== "finalized" && finalizedRow) {
      await writeStudentScheduleFinalizedNotifications(supabase, {
        studentId: id,
        studentName: finalizedRow.name,
      });
    }
    return { ok: true, rows: refreshed.rows, source: refreshed.source };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
}

export async function recordTeacherScheduleConflictOverrideResolved(
  studentId: string,
  input: {
    teacherId: string;
    slot: string;
    classIds: string[];
    reason?: string | null;
    semesterId?: string | null;
    recordedByProfileId?: string | null;
  },
): Promise<
  | { ok: true; rows: StudentScheduleRow[]; source: DataSource; overrideId: string }
  | { ok: false; message: string }
> {
  const id = studentId.trim();
  const teacherId = input.teacherId.trim();
  const slot = input.slot.trim();
  const classIds = uniqueNonEmpty(input.classIds);
  if (!id) return { ok: false, message: "Student id is required." };
  if (!teacherId) return { ok: false, message: "Teacher id is required." };
  if (!slot) return { ok: false, message: "Schedule slot is required." };
  if (classIds.length < 2) return { ok: false, message: "At least two class ids are required for a teacher conflict override." };
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };

  try {
    const supabase = await createSupabaseServerClient();
    const semesterId = await resolveSemesterFilter(supabase, input);
    const recordedByProfileId = String(input.recordedByProfileId ?? "").trim() || null;
    const { data, error } = await supabase
      .from("teacher_conflict_overrides")
      .insert({
        teacher_id: teacherId,
        slot,
        class_ids: classIds,
        reason: String(input.reason ?? "").trim(),
        active: true,
        decided_by_profile_id: recordedByProfileId,
      })
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    const overrideId = String((data as Record<string, unknown> | null)?.id ?? "").trim();
    if (!overrideId) return { ok: false, message: "Teacher conflict override was not returned." };

    await writeScheduleConflictOverrideAuditEvent(supabase, {
      studentId: id,
      teacherId,
      slot,
      classIds,
      overrideId,
      reason: input.reason,
    });

    const refreshed = await fetchStudentScheduleResolved(id, supabase, { semesterId });
    const row = refreshed.rows[0];
    if (row) {
      const snapshot = await recordStudentScheduleSnapshot(row, supabase, {
        semesterId,
        recordedByProfileId,
        reason: "Teacher conflict override recorded",
        sourceAction: "schedule_conflict.override",
        sourceEntityType: "teacher_conflict_override",
        sourceEntityId: overrideId,
      });
      if (!snapshot.ok) return { ok: false, message: snapshot.message };
      await writeScheduleAttentionNotifications(supabase, row);
    }

    return { ok: true, rows: refreshed.rows, source: refreshed.source, overrideId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
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
