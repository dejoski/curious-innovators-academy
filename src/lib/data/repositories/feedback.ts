import type { FeedbackSubmissionRecord } from "@/lib/data/types";
import { isSupabaseConfigured } from "@/lib/data/env";
import { FEEDBACK_FALLBACK } from "@/lib/data/mock/feedback";
import { restSelectRows } from "@/lib/supabase/rest";

function mapFeedbackRow(row: Record<string, unknown>): FeedbackSubmissionRecord | null {
  const id = String(row.id ?? "");
  if (!id) return null;
  return {
    id,
    mood: String(row.mood ?? ""),
    nps: Number(row.nps ?? row.nps_score ?? 0),
    submittedAt: String(row.submitted_at ?? row.created_at ?? ""),
  };
}

/** Aggregated parent feedback rows — empty demo until telemetry lands in Supabase. */
export async function fetchFeedbackSubmissions(): Promise<FeedbackSubmissionRecord[]> {
  if (!isSupabaseConfigured()) return [...FEEDBACK_FALLBACK];

  const { data, error } = await restSelectRows<Record<string, unknown>>("feedback_submissions", {
    order: "id.desc",
  });

  if (error || !data?.length) return [...FEEDBACK_FALLBACK];

  const mapped = data.map(mapFeedbackRow).filter((x): x is FeedbackSubmissionRecord => x !== null);
  return mapped.length > 0 ? mapped : [...FEEDBACK_FALLBACK];
}
