import type { ResolvedList } from "@/lib/data/fetch-source";
import type { EnrichmentRequestRow, RequestStatus } from "@/lib/data/types";
import { requireAdminReadClient, type AdminReadClient } from "@/lib/api/admin-read";
import { isSupabaseConfigured, unavailableList } from "@/lib/data/env";
import { firstRel } from "@/lib/data/repositories/relations";
import {
  formatBlockDayLabel,
  formatClassLevelLabel,
  formatRequestOptionLabel,
} from "@/lib/schedule-slots";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RequestReadClient = Awaited<ReturnType<typeof createSupabaseServerClient>> | AdminReadClient;

export type EnrichmentDecisionSummary = {
  approved: number;
  waitlisted: number;
  rejected: number;
};

export type ApprovalHistoryRow = {
  id: string;
  student: string;
  parent: string;
  className: string;
  block: string;
  option: string;
  status: Exclude<RequestStatus, "Pending">;
  reviewedBy: string;
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
  const guardian = s ? String(s.guardian_label ?? "") : "";
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
      guardian ||
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
    parent: String(student?.guardian_label ?? ""),
    class: String(cls?.name ?? cls?.class_name ?? ""),
    block: formatBlockDayLabel(cls?.block, undefined, cls?.schedule_summary),
    level: formatClassLevelLabel(cls?.level),
    option: "Final placement",
    status,
  };
}

async function loadRequestsResolved(client?: RequestReadClient): Promise<ResolvedList<EnrichmentRequestRow>> {
  if (!isSupabaseConfigured()) {
    return unavailableList();
  }

  try {
    const supabase = client ?? await createSupabaseServerClient();
    const [requestsResult, enrollmentsResult] = await Promise.all([
      supabase
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
        students ( display_name, guardian_label ),
        classes ( name, level ),
        requester:profiles!class_requests_requested_by_profile_id_fkey ( display_name, email )
      `,
      )
        .order("created_at", { ascending: true }),
      supabase
        .from("enrollments")
        .select(
          `
          id,
          student_id,
          class_id,
          status,
          created_at,
          students ( display_name, guardian_label ),
          classes ( name, program, block, level, schedule_summary )
        `,
        )
        .order("created_at", { ascending: false }),
    ]);

    if (requestsResult.error || enrollmentsResult.error) {
      return unavailableList();
    }

    const pendingRows = (requestsResult.data ?? [])
      .map((row) => mapRequestRow(row as unknown as Record<string, unknown>))
      .filter((x): x is EnrichmentRequestRow => x !== null);
    const decisionRows = (enrollmentsResult.data ?? [])
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

export async function fetchEnrichmentRequestsResolved(): Promise<
  ResolvedList<EnrichmentRequestRow>
> {
  return loadRequestsResolved();
}

export async function fetchAdminEnrichmentRequestsResolved(): Promise<
  ResolvedList<EnrichmentRequestRow>
> {
  const access = await requireAdminReadClient();
  if (!access) return unavailableList();
  return loadRequestsResolved(access.client);
}

function isEnrichmentClass(row: Record<string, unknown>): boolean {
  const cls = firstRel<Record<string, unknown>>(row.classes);
  return String(cls?.program ?? "").toLowerCase() === "enrichment";
}

async function loadEnrichmentDecisionSummaryResolved(client?: RequestReadClient): Promise<EnrichmentDecisionSummary> {
  if (!isSupabaseConfigured()) return { ...EMPTY_DECISION_SUMMARY };
  const supabase = client ?? await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("enrollments")
    .select("status, classes ( program )");
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

function mapApprovalHistoryRow(row: Record<string, unknown>): ApprovalHistoryRow | null {
  if (row.id == null || String(row.id) === "") return null;
  if (!isEnrichmentClass(row)) return null;

  const status = mapStatus(row.status);
  if (status === "Pending") return null;

  const student = firstRel<Record<string, unknown>>(row.students);
  const cls = firstRel<Record<string, unknown>>(row.classes);
  return {
    id: String(row.id),
    student: String(student?.display_name ?? student?.student_name ?? ""),
    parent: String(student?.guardian_label ?? ""),
    className: String(cls?.name ?? cls?.class_name ?? ""),
    block: formatBlockDayLabel(cls?.block, undefined, cls?.schedule_summary),
    option: "Not recorded",
    status,
    reviewedBy: "Not recorded",
    reason: "Not recorded",
  };
}

async function loadApprovalHistoryResolved(client?: RequestReadClient): Promise<
  ResolvedList<ApprovalHistoryRow>
> {
  if (!isSupabaseConfigured()) return unavailableList();
  const supabase = client ?? await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("enrollments")
    .select(
      `
      id,
      student_id,
      class_id,
      status,
      created_at,
      students ( display_name, guardian_label ),
      classes ( name, program, block, level, schedule_summary )
    `,
    )
    .order("created_at", { ascending: false });
  if (error) return unavailableList();

  return {
    items: ((data ?? []) as unknown as Record<string, unknown>[])
      .map(mapApprovalHistoryRow)
      .filter((row): row is ApprovalHistoryRow => row !== null),
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
