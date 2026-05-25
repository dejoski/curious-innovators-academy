import type { FeedbackSubmissionRecord } from "@/lib/data/types";
import { isSupabaseConfigured } from "@/lib/data/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

/** Aggregated parent feedback rows from the RLS-scoped feedback table. */
export async function fetchFeedbackSubmissions(): Promise<FeedbackSubmissionRecord[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("feedback")
      .select("id,mood,nps_score,rating,created_at")
      .order("created_at", { ascending: false })
      .limit(25);

    if (error || !data?.length) return [];

    const mapped = (data as Record<string, unknown>[])
      .map(mapFeedbackRow)
      .filter((x): x is FeedbackSubmissionRecord => x !== null);
    return mapped;
  } catch {
    return [];
  }
}
