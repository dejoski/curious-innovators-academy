import { isSupabaseConfigured } from "@/lib/data/env";
import { requireAdminReadClient, type AdminReadClient } from "@/lib/api/admin-read";
import {
  getDashboardDailyBlocks,
  type DashboardDailyBlockRow,
  type DashboardHeadCounts,
} from "@/lib/dashboard-metrics";
import { fetchAdminStudentSchedulesResolved } from "@/lib/data/repositories/student-details";

type CountTable = "students" | "teachers" | "classes";

type CountQuerySuccess = { ok: true; table: CountTable; count: number };
type CountQueryFailure = { ok: false; table: CountTable; error: string };
type CountQueryResult = CountQuerySuccess | CountQueryFailure;

export type ResolvedDashboardPresentation = {
  metrics: DashboardHeadCounts;
  dailyRows: DashboardDailyBlockRow[];
  systemAlerts: { id: string; title: string; detail: string; href: string }[];
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
    systemAlerts: [],
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

async function parentStudentLinkAlerts(
  supabase: AdminReadClient,
): Promise<{ id: string; title: string; detail: string; href: string }[]> {
  const [parentsResult, studentsResult, linksResult] = await Promise.all([
    supabase.from("parents").select("id"),
    supabase.from("students").select("id"),
    supabase.from("parent_students").select("parent_id, student_id"),
  ]);
  if (parentsResult.error || studentsResult.error || linksResult.error) return [];

  const parentIds = new Set((parentsResult.data ?? []).map((row) => String(row.id)));
  const studentIds = new Set((studentsResult.data ?? []).map((row) => String(row.id)));
  const linkedParentIds = new Set((linksResult.data ?? []).map((row) => String(row.parent_id)));
  const linkedStudentIds = new Set((linksResult.data ?? []).map((row) => String(row.student_id)));
  const orphanParents = [...parentIds].filter((id) => !linkedParentIds.has(id)).length;
  const orphanStudents = [...studentIds].filter((id) => !linkedStudentIds.has(id)).length;

  const alerts: { id: string; title: string; detail: string; href: string }[] = [];
  if (orphanParents > 0) {
    alerts.push({
      id: "orphan-parents",
      title: `${orphanParents} parent${orphanParents === 1 ? "" : "s"} need student links`,
      detail: "Assign students from the Parents directory.",
      href: "/dashboard/parents",
    });
  }
  if (orphanStudents > 0) {
    alerts.push({
      id: "orphan-students",
      title: `${orphanStudents} student${orphanStudents === 1 ? "" : "s"} need parent links`,
      detail: "Connect students to a parent or guardian.",
      href: "/dashboard/parents",
    });
  }
  return alerts;
}

async function studentScheduleSystemAlerts(): Promise<{ id: string; title: string; detail: string; href: string }[]> {
  const { rows, source } = await fetchAdminStudentSchedulesResolved();
  if (source !== "remote") return [];

  const incompleteSchedules = rows.filter((row) => (row.incompleteBlocks ?? 0) > 0);
  const schedulesWithConflicts = rows.filter((row) => row.hasConflicts || (row.conflicts?.length ?? 0) > 0);
  const alerts: { id: string; title: string; detail: string; href: string }[] = [];

  if (incompleteSchedules.length > 0) {
    alerts.push({
      id: "incomplete-student-schedules",
      title: `${incompleteSchedules.length} student schedule${incompleteSchedules.length === 1 ? "" : "s"} incomplete`,
      detail: "Review open blocks before finalizing schedules.",
      href: "/dashboard/students",
    });
  }

  if (schedulesWithConflicts.length > 0) {
    alerts.push({
      id: "student-schedule-conflicts",
      title: `${schedulesWithConflicts.length} schedule conflict${schedulesWithConflicts.length === 1 ? "" : "s"} detected`,
      detail: "Resolve overlapping confirmed placements before finalizing.",
      href: "/dashboard/students",
    });
  }

  return alerts;
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

    const [results, parentLinkAlerts, scheduleAlerts] = await Promise.all([
      Promise.all([
      countExact(access.client, "students"),
      countExact(access.client, "teachers"),
      countExact(access.client, "classes", { column: "program", value: "core" }),
      countExact(access.client, "classes", { column: "program", value: "enrichment" }),
      ]),
      parentStudentLinkAlerts(access.client),
      studentScheduleSystemAlerts(),
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
      systemAlerts: [...scheduleAlerts, ...parentLinkAlerts],
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
