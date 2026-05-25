import { isSupabaseConfigured } from "@/lib/data/env";
import { isSupabaseAdminConfigured } from "@/lib/data/server-env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getDashboardDailyBlocks,
  type DashboardDailyBlockRow,
  type DashboardHeadCounts,
} from "@/lib/dashboard-metrics";

type AppRole = "admin" | "parent" | "teacher" | "student";

type CountTable = "students" | "teachers" | "classes";

type DashboardCountClient = Awaited<ReturnType<typeof createSupabaseServerClient>> | ReturnType<
  typeof createSupabaseAdminClient
>;

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

function normalizeRole(raw: unknown): AppRole {
  const role = String(raw ?? "").toLowerCase();
  if (role === "admin" || role === "parent" || role === "teacher" || role === "student") return role;
  return "parent";
}

async function resolveCurrentUserRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<AppRole | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) return null;
  return normalizeRole(profile?.role);
}

async function countExact(
  supabase: DashboardCountClient,
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

function buildCountClient(sessionClient: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  if (!isSupabaseAdminConfigured()) return sessionClient;
  try {
    return createSupabaseAdminClient();
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : "unknown service-role init error";
    console.warn(`dashboard-presentation: service-role unavailable, falling back to session client. reason=${reason}`);
    return sessionClient;
  }
}

/**
 * Dashboard stat cards + Daily Blocks derived from the same counts.
 * Uses admin client when available for count totals, then falls back to session client
 * only if service-role initialization is unavailable.
 */
export async function resolveDashboardPresentation(): Promise<ResolvedDashboardPresentation> {
  if (!isSupabaseConfigured()) return unavailablePresentation();

  try {
    const sessionClient = await createSupabaseServerClient();
    const role = await resolveCurrentUserRole(sessionClient);
    if (role !== "admin") {
      return unavailablePresentation();
    }

    const countClient = buildCountClient(sessionClient);
    const countSource = countClient === sessionClient ? "session-client" : "admin-client";

    const results = await Promise.all([
      countExact(countClient, "students"),
      countExact(countClient, "teachers"),
      countExact(countClient, "classes", { column: "program", value: "core" }),
      countExact(countClient, "classes", { column: "program", value: "enrichment" }),
    ]);

    const failures = results.filter((result): result is CountQueryFailure => !result.ok);
    if (failures.length > 0) {
      console.warn(
        `dashboard-presentation: count failure path=${countSource}; ${failures
          .map((failure) => `${failure.table}:${failure.error}`)
          .join(" | ")}`,
      );
      return unavailablePresentation();
    }

    const studentCount = results[0].count;
    const teacherCount = results[1].count;
    const coreClassCount = results[2].count;
    const enrichmentOfferingCount = results[3].count;

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
    const details =
      error instanceof Error ? `${error.name}: ${error.message}` : "Unknown dashboard count error";
    console.warn(`dashboard-presentation: failed to resolve admin counts; exception=${details}`);
    return unavailablePresentation();
  }
}
