import { isSupabaseConfigured } from "@/lib/data/env";
import { requireAdminReadClient, type AdminReadClient } from "@/lib/api/admin-read";
import {
  getDashboardDailyBlocks,
  type DashboardDailyBlockRow,
  type DashboardHeadCounts,
} from "@/lib/dashboard-metrics";

type CountTable = "students" | "teachers" | "classes";

type CountQuerySuccess = { ok: true; table: CountTable; count: number };
type CountQueryFailure = { ok: false; table: CountTable; error: string };
type CountQueryResult = CountQuerySuccess | CountQueryFailure;

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

function isNextDynamicServerError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const digest = "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";
  return error.message.includes("Dynamic server usage") || digest.includes("DYNAMIC_SERVER_USAGE");
}

async function countExact(
  supabase: AdminReadClient,
  table: CountTable,
  eq?: { column: "program" | "track"; value: string },
): Promise<CountQueryResult> {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (eq) {
    query = query.eq(eq.column, eq.value);
  }

  const { count, error } = await query;
  if (error) {
    return { ok: false, table, error: `count failed for ${table}: ${error.message}` };
  }
  return { ok: true, table, count: count ?? 0 };
}

/**
 * Dashboard stat cards + Daily Blocks derived from the same counts.
 * Uses a service-role client only after the current server session is verified as admin.
 */
export async function resolveDashboardPresentation(): Promise<ResolvedDashboardPresentation> {
  if (!isSupabaseConfigured()) return unavailablePresentation();

  try {
    const access = await requireAdminReadClient();
    if (!access) return unavailablePresentation();

    const results = await Promise.all([
      countExact(access.client, "students"),
      countExact(access.client, "teachers"),
      countExact(access.client, "classes", { column: "program", value: "core" }),
      countExact(access.client, "classes", { column: "program", value: "enrichment" }),
    ]);

    const failures = results.filter((result): result is CountQueryFailure => !result.ok);
    if (failures.length > 0) {
      console.warn(
        `dashboard-presentation: admin count failure; ${failures
          .map((failure) => `${failure.table}:${failure.error}`)
          .join(" | ")}`,
      );
      return unavailablePresentation();
    }

    const [
      studentCount,
      teacherCount,
      coreClassCount,
      enrichmentOfferingCount,
    ] = results.map((result) => (result.ok ? result.count : 0));

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
  } catch (error: unknown) {
    if (isNextDynamicServerError(error)) throw error;
    const details =
      error instanceof Error ? `${error.name}: ${error.message}` : "Unknown dashboard count error";
    console.warn(`dashboard-presentation: failed to resolve admin counts; exception=${details}`);
    return unavailablePresentation();
  }
}
