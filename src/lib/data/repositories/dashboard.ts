import {
  getDashboardDailyBlocks,
  type DashboardDailyBlockRow,
  type DashboardHeadCounts,
} from "@/lib/dashboard-metrics";
import { isSupabaseConfigured } from "@/lib/data/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResolvedDashboardPresentation = {
  metrics: DashboardHeadCounts;
  dailyRows: DashboardDailyBlockRow[];
  /** True when counts came from Supabase (all four head counts succeeded). */
  fromRemote: boolean;
};

function unavailablePresentation(): ResolvedDashboardPresentation {
  const metrics = {
    studentCount: 0,
    teacherCount: 0,
    coreClassCount: 0,
    enrichmentOfferingCount: 0,
  };
  return {
    metrics,
    dailyRows: getDashboardDailyBlocks(),
    fromRemote: false,
  };
}

async function countExact(
  table: "students" | "teachers" | "classes",
  eq?: { column: "program" | "track"; value: string },
): Promise<number | null> {
  const supabase = await createSupabaseServerClient();
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (eq) {
    q = q.eq(eq.column, eq.value);
  }
  const { count, error } = await q;
  if (error) return null;
  return count ?? 0;
}

/**
 * Dashboard stat cards + Daily Blocks derived from the same counts.
 * Uses authenticated server client (RLS); column is `program` on `classes`.
 */
export async function resolveDashboardPresentation(): Promise<ResolvedDashboardPresentation> {
  if (!isSupabaseConfigured()) return unavailablePresentation();

  try {
    const [studentCount, teacherCount, coreClassCount, enrichmentOfferingCount] =
      await Promise.all([
        countExact("students"),
        countExact("teachers"),
        countExact("classes", { column: "program", value: "core" }),
        countExact("classes", { column: "program", value: "enrichment" }),
      ]);

    if (
      studentCount === null ||
      teacherCount === null ||
      coreClassCount === null ||
      enrichmentOfferingCount === null
    ) {
      return unavailablePresentation();
    }

    const metrics: DashboardHeadCounts = {
      studentCount,
      teacherCount,
      coreClassCount,
      enrichmentOfferingCount,
    };

    return {
      metrics,
      dailyRows: getDashboardDailyBlocks(),
      fromRemote: true,
    };
  } catch {
    return unavailablePresentation();
  }
}
