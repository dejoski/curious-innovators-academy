import type { ResolvedList } from "@/lib/data/fetch-source";
import type { EnrichmentRequestRow, RequestStatus } from "@/lib/data/types";
import { requireAdminReadClient, type AdminReadClient } from "@/lib/api/admin-read";
import { isSupabaseConfigured, unavailableList } from "@/lib/data/env";
import { parentContactFromStudentRow, STUDENT_PARENT_CONTACT_SELECT } from "@/lib/data/parent-contact";
import { firstRel } from "@/lib/data/repositories/relations";
import {
  formatBlockDayLabel,
  formatClassLevelLabel,
  formatRequestOptionLabel,
} from "@/lib/schedule-slots";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RequestReadClient = Awaited<ReturnType<typeof createSupabaseServerClient>> | AdminReadClient;
type RequestQueryOptions = { semesterId?: string | null; studentIds?: readonly string[] };

export type EnrichmentDecisionSummary = {
  approved: number;
  waitlisted: number;
  rejected: number;
};

export type ApprovalHistoryRow = {
  id: string;
  studentId?: string;
  classId?: string;
  student: string;
  parent: string;
  className: string;
  block: string;
  option: string;
  status: Exclude<RequestStatus, "Pending">;
  reviewedBy: string;
  reviewedAt: string;
  reviewedAtIso?: string;
  requestedAt?: string;
  reason: string;
};

const EMPTY_DECISION_SUMMARY: EnrichmentDecisionSummary = {
  approved: 0,
  waitlisted: 0,
  rejected: 0,
};

function mapStatus(raw: unknown): RequestStatus {
  const s = String(raw ?? "");
  if (s === "Approved" || s === "Rejected" || s === "Pending" || s === "Waitlisted") return s;
  const lower = s.toLowerCase();
  if (lower === "approved") return "Approved";
  if (lower === "rejected") return "Rejected";
  if (lower === "waitlisted" || lower === "waitlist") return "Waitlisted";
  return "Pending";
}

export function mapRequestRow(row: Record<string, unknown>): EnrichmentRequestRow | null {
  if (row.id == null || String(row.id) === "") return null;

  const id = String(row.id);
  const s = firstRel<Record<string, unknown>>(row.students);
  const c = firstRel<Record<string, unknown>>(row.classes);
  const r = firstRel<Record<string, unknown>>(row.requester);

  const studentName = s ? String(s.display_name ?? s.student_name ?? "") : "";
  const parentContact = parentContactFromStudentRow(s);
  const className = c ? String(c.name ?? c.class_name ?? "") : "";
  const classLevel = c ? String(c.level ?? "") : "";
  const requesterName = r ? String(r.display_name ?? "") : "";
  const requestBlock = row.block;
  const requestDay = row.level;
  const rawOption = row.option_rank ?? row.option_label ?? row.option;

  return {
    id,
    studentId: row.student_id == null ? undefined : String(row.student_id),
    classId: row.class_id == null ? undefined : String(row.class_id),
    student: studentName || String(row.student_name ?? row.student ?? ""),
    parent:
      parentContact.name ||
      requesterName ||
      String(row.parent_name ?? row.parent ?? ""),
    class: className || String(row.class_name ?? row.class_title ?? row.class ?? ""),
    block: formatBlockDayLabel(requestBlock, requestDay),
    level: formatClassLevelLabel(classLevel),
    option: formatRequestOptionLabel(rawOption),
    status: mapStatus(row.status),
  };
}

function mapEnrollmentDecisionRequestRow(row: Record<string, unknown>): EnrichmentRequestRow | null {
  if (row.id == null || String(row.id) === "") return null;
  if (!isEnrichmentClass(row)) return null;

  const status = mapStatus(row.status);
  if (status === "Pending") return null;

  const student = firstRel<Record<string, unknown>>(row.students);
  const cls = firstRel<Record<string, unknown>>(row.classes);
  return {
    id: `enrollment:${String(row.id)}`,
    studentId: row.student_id == null ? undefined : String(row.student_id),
    classId: row.class_id == null ? undefined : String(row.class_id),
    student: String(student?.display_name ?? student?.student_name ?? ""),
    parent: parentContactFromStudentRow(student).name,
    class: String(cls?.name ?? cls?.class_name ?? ""),
    block: formatBlockDayLabel(cls?.block, undefined, cls?.schedule_summary),
    level: formatClassLevelLabel(cls?.level),
    option: "Final placement",
    status,
  };
}

async function loadRequestsResolved(client?: RequestReadClient, options?: RequestQueryOptions): Promise<ResolvedList<EnrichmentRequestRow>> {
  if (!isSupabaseConfigured()) {
    return unavailableList();
  }
  const studentIds = options?.studentIds?.map((id) => id.trim()).filter(Boolean);
  if (studentIds && studentIds.length === 0) {
    return { items: [], source: "remote" };
  }

  try {
    const supabase = client ?? await createSupabaseServerClient();
    let requestsQuery = supabase
      .from("class_requests")
      .select(
        `
        id,
        student_id,
        class_id,
        status,
        block,
        level,
        option_label,
        students ( display_name, guardian_label, ${STUDENT_PARENT_CONTACT_SELECT} ),
        classes ( name, level ),
        requester:profiles!class_requests_requested_by_profile_id_fkey ( display_name, email )
      `,
      )
      .order("created_at", { ascending: true });
    let enrollmentsQuery = supabase
      .from("enrollments")
      .select(
        `
        id,
        student_id,
        class_id,
        status,
        created_at,
        students ( display_name, guardian_label, ${STUDENT_PARENT_CONTACT_SELECT} ),
        classes ( name, program, block, level, schedule_summary )
      `,
      )
      .order("created_at", { ascending: false });

    if (studentIds) {
      requestsQuery = requestsQuery.in("student_id", studentIds);
      enrollmentsQuery = enrollmentsQuery.in("student_id", studentIds);
    }

    const [requestsResult, enrollmentsResult] = await Promise.all([
      requestsQuery,
      enrollmentsQuery,
    ]);

    if (requestsResult.error || enrollmentsResult.error) {
      return unavailableList();
    }

    const pendingRows = ((requestsResult.data ?? []) as unknown as Record<string, unknown>[])
      .map((row) => mapRequestRow(row as unknown as Record<string, unknown>))
      .filter((x): x is EnrichmentRequestRow => x !== null);
    const decisionRows = ((enrollmentsResult.data ?? []) as unknown as Record<string, unknown>[])
      .map((row) => mapEnrollmentDecisionRequestRow(row as unknown as Record<string, unknown>))
      .filter((x): x is EnrichmentRequestRow => x !== null);

    return { items: [...pendingRows, ...decisionRows], source: "remote" };
  } catch {
    return unavailableList();
  }
}

/** Enrichment coordinator queue. */
export async function fetchEnrichmentRequests(): Promise<EnrichmentRequestRow[]> {
  const { items } = await loadRequestsResolved();
  return items;
}

export async function fetchEnrichmentRequestsResolved(options?: RequestQueryOptions): Promise<
  ResolvedList<EnrichmentRequestRow>
> {
  return loadRequestsResolved(undefined, options);
}

export async function fetchAdminEnrichmentRequestsResolved(options?: RequestQueryOptions): Promise<
  ResolvedList<EnrichmentRequestRow>
> {
  const access = await requireAdminReadClient();
  if (!access) return unavailableList();
  return loadRequestsResolved(access.client, options);
}

export async function fetchEnrichmentRequestsForClientResolved(
  client: RequestReadClient,
  options?: RequestQueryOptions,
): Promise<ResolvedList<EnrichmentRequestRow>> {
  return loadRequestsResolved(client, options);
}

function isEnrichmentClass(row: Record<string, unknown>): boolean {
  const cls = firstRel<Record<string, unknown>>(row.classes);
  return String(cls?.program ?? "").toLowerCase() === "enrichment";
}

const SCHOOL_TIME_ZONE = "America/New_York";

function dateIso(raw: unknown): string | undefined {
  const value = String(raw ?? "").trim();
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function formatSchoolTimestamp(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: SCHOOL_TIME_ZONE,
  });
}

async function loadEnrichmentDecisionSummaryResolved(
  client?: RequestReadClient,
  studentIds?: readonly string[],
): Promise<EnrichmentDecisionSummary> {
  if (!isSupabaseConfigured()) return { ...EMPTY_DECISION_SUMMARY };
  const normalizedStudentIds = studentIds?.map((id) => id.trim()).filter(Boolean);
  if (normalizedStudentIds && normalizedStudentIds.length === 0) return { ...EMPTY_DECISION_SUMMARY };
  const supabase = client ?? await createSupabaseServerClient();
  let query = supabase
    .from("enrollments")
    .select("status, classes ( program )");
  if (normalizedStudentIds) {
    query = query.in("student_id", normalizedStudentIds);
  }
  const { data, error } = await query;
  if (error || !data?.length) return { ...EMPTY_DECISION_SUMMARY };

  return (data as unknown as Record<string, unknown>[]).reduce<EnrichmentDecisionSummary>(
    (summary, row) => {
      if (!isEnrichmentClass(row)) return summary;
      const status = mapStatus(row.status);
      if (status === "Approved") summary.approved += 1;
      else if (status === "Waitlisted") summary.waitlisted += 1;
      else if (status === "Rejected") summary.rejected += 1;
      return summary;
    },
    { ...EMPTY_DECISION_SUMMARY },
  );
}

export async function fetchEnrichmentDecisionSummaryResolved(): Promise<EnrichmentDecisionSummary> {
  return loadEnrichmentDecisionSummaryResolved();
}

export async function fetchAdminEnrichmentDecisionSummaryResolved(): Promise<EnrichmentDecisionSummary> {
  const access = await requireAdminReadClient();
  if (!access) return { ...EMPTY_DECISION_SUMMARY };
  return loadEnrichmentDecisionSummaryResolved(access.client);
}

export async function fetchEnrichmentDecisionSummaryForClientResolved(
  client: RequestReadClient,
  studentIds: readonly string[],
): Promise<EnrichmentDecisionSummary> {
  return loadEnrichmentDecisionSummaryResolved(client, studentIds);
}

function mapApprovalHistoryRow(row: Record<string, unknown>): ApprovalHistoryRow | null {
  if (row.id == null || String(row.id) === "") return null;
  if (!isEnrichmentClass(row)) return null;

  const status = mapStatus(row.status);
  if (status === "Pending") return null;

  const student = firstRel<Record<string, unknown>>(row.students);
  const cls = firstRel<Record<string, unknown>>(row.classes);
  const reviewedAtIso = dateIso(row.created_at);
  return {
    id: String(row.id),
    studentId: row.student_id == null ? undefined : String(row.student_id),
    classId: row.class_id == null ? undefined : String(row.class_id),
    student: String(student?.display_name ?? student?.student_name ?? ""),
    parent: parentContactFromStudentRow(student).name,
    className: String(cls?.name ?? cls?.class_name ?? ""),
    block: formatBlockDayLabel(cls?.block, undefined, cls?.schedule_summary),
    option: "Not recorded",
    status,
    reviewedBy: "Not recorded",
    reviewedAt: formatSchoolTimestamp(row.created_at),
    reviewedAtIso,
    requestedAt: undefined,
    reason: "Not recorded",
  };
}

function mapDecisionHistoryRow(row: Record<string, unknown>): ApprovalHistoryRow | null {
  if (row.id == null || String(row.id) === "") return null;
  if (!isEnrichmentClass(row)) return null;

  const status = mapStatus(row.status);
  if (status === "Pending") return null;

  const student = firstRel<Record<string, unknown>>(row.students);
  const cls = firstRel<Record<string, unknown>>(row.classes);
  const reviewer = firstRel<Record<string, unknown>>(row.reviewer);
  const reviewedAtIso = dateIso(row.decided_at);
  const rawReason = String(row.reason ?? "").trim();
  const option = String(row.option_label ?? "").trim();

  return {
    id: String(row.id),
    studentId: row.student_id == null ? undefined : String(row.student_id),
    classId: row.class_id == null ? undefined : String(row.class_id),
    student: String(student?.display_name ?? student?.student_name ?? ""),
    parent: parentContactFromStudentRow(student).name,
    className: String(cls?.name ?? cls?.class_name ?? ""),
    block: formatBlockDayLabel(row.block ?? cls?.block, row.level, cls?.schedule_summary),
    option: option ? formatRequestOptionLabel(option) : "Not recorded",
    status,
    reviewedBy: String(reviewer?.display_name ?? reviewer?.email ?? "").trim() || "Not recorded",
    reviewedAt: formatSchoolTimestamp(row.decided_at),
    reviewedAtIso,
    requestedAt: formatSchoolTimestamp(row.requested_at),
    reason: rawReason || "Not recorded",
  };
}

function decisionKey(row: ApprovalHistoryRow): string {
  return `${row.studentId ?? ""}\u0000${row.classId ?? ""}\u0000${row.status}`;
}

async function loadApprovalHistoryResolved(client?: RequestReadClient): Promise<
  ResolvedList<ApprovalHistoryRow>
> {
  if (!isSupabaseConfigured()) return unavailableList();
  const supabase = client ?? await createSupabaseServerClient();
  const [decisionsResult, enrollmentsResult] = await Promise.all([
    supabase
      .from("class_request_decisions")
      .select(
        `
        id,
        original_request_id,
        student_id,
        class_id,
        requested_by_profile_id,
        decided_by_profile_id,
        status,
        block,
        level,
        option_label,
        reason,
        requested_at,
        decided_at,
        students ( display_name, guardian_label, ${STUDENT_PARENT_CONTACT_SELECT} ),
        classes ( name, program, block, level, schedule_summary ),
        reviewer:profiles!class_request_decisions_decided_by_profile_id_fkey ( display_name, email )
      `,
      )
      .order("decided_at", { ascending: false }),
    supabase
      .from("enrollments")
      .select(
        `
        id,
        student_id,
        class_id,
        status,
        created_at,
        students ( display_name, guardian_label, ${STUDENT_PARENT_CONTACT_SELECT} ),
        classes ( name, program, block, level, schedule_summary )
      `,
      )
      .order("created_at", { ascending: false }),
  ]);

  if (decisionsResult.error || enrollmentsResult.error) return unavailableList();

  const decisionRows = ((decisionsResult.data ?? []) as unknown as Record<string, unknown>[])
    .map(mapDecisionHistoryRow)
    .filter((row): row is ApprovalHistoryRow => row !== null);
  const loggedKeys = new Set(decisionRows.map(decisionKey));
  const enrollmentRows = ((enrollmentsResult.data ?? []) as unknown as Record<string, unknown>[])
    .map(mapApprovalHistoryRow)
    .filter((row): row is ApprovalHistoryRow => row !== null)
    .filter((row) => !loggedKeys.has(decisionKey(row)));

  return {
    items: [...decisionRows, ...enrollmentRows].sort((a, b) => {
      const av = a.reviewedAtIso ?? "";
      const bv = b.reviewedAtIso ?? "";
      return bv.localeCompare(av);
    }),
    source: "remote",
  };
}

export async function fetchApprovalHistoryResolved(): Promise<
  ResolvedList<ApprovalHistoryRow>
> {
  return loadApprovalHistoryResolved();
}

export async function fetchAdminApprovalHistoryResolved(): Promise<
  ResolvedList<ApprovalHistoryRow>
> {
  const access = await requireAdminReadClient();
  if (!access) return unavailableList();
  return loadApprovalHistoryResolved(access.client);
}
