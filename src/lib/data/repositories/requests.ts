import type { ResolvedList } from "@/lib/data/fetch-source";
import type { EnrichmentRequestRow, RequestStatus } from "@/lib/data/types";
import { fallbackList, isSupabaseConfigured } from "@/lib/data/env";
import { REQUESTS_FALLBACK } from "@/lib/data/mock/requests";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function mapStatus(raw: unknown): RequestStatus {
  const s = String(raw ?? "");
  if (s === "Approved" || s === "Rejected" || s === "Pending" || s === "Waitlisted") return s;
  const lower = s.toLowerCase();
  if (lower === "approved") return "Approved";
  if (lower === "rejected") return "Rejected";
  if (lower === "waitlisted" || lower === "waitlist") return "Waitlisted";
  return "Pending";
}

function firstRel<T extends Record<string, unknown>>(v: unknown): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return v as T;
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
  const requesterName = r ? String(r.display_name ?? "") : "";

  return {
    id,
    student: studentName || String(row.student_name ?? row.student ?? ""),
    parent:
      guardian ||
      requesterName ||
      String(row.parent_name ?? row.parent ?? ""),
    class: className || String(row.class_name ?? row.class_title ?? row.class ?? ""),
    block: String(row.block ?? ""),
    level: String(row.level ?? ""),
    option: String(row.option_rank ?? row.option_label ?? row.option ?? ""),
    status: mapStatus(row.status),
  };
}

async function loadRequestsResolved(): Promise<ResolvedList<EnrichmentRequestRow>> {
  if (!isSupabaseConfigured()) {
    return fallbackList(REQUESTS_FALLBACK);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("class_requests")
      .select(
        `
        id,
        status,
        block,
        level,
        option_label,
        students ( display_name, guardian_label ),
        classes ( name ),
        requester:profiles!class_requests_requested_by_profile_id_fkey ( display_name, email )
      `,
      )
      .order("created_at", { ascending: true });

    if (error) {
      return fallbackList(REQUESTS_FALLBACK);
    }

    if (!data?.length) {
      return { items: [], source: "remote" };
    }

    const mapped = data
      .map((row) => mapRequestRow(row as unknown as Record<string, unknown>))
      .filter((x): x is EnrichmentRequestRow => x !== null);

    if (mapped.length === 0) {
      return fallbackList(REQUESTS_FALLBACK);
    }
    return { items: mapped, source: "remote" };
  } catch {
    return fallbackList(REQUESTS_FALLBACK);
  }
}

/** Enrichment coordinator queue — fallback preserved for demos. */
export async function fetchEnrichmentRequests(): Promise<EnrichmentRequestRow[]> {
  const { items } = await loadRequestsResolved();
  return items;
}

export async function fetchEnrichmentRequestsResolved(): Promise<
  ResolvedList<EnrichmentRequestRow>
> {
  return loadRequestsResolved();
}
