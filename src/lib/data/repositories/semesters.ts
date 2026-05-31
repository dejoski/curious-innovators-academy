import "server-only";

import type { DataSource } from "@/lib/data/fetch-source";
import type { SemesterRow } from "@/lib/data/types";
import { requireAdminReadClient, type AdminReadClient } from "@/lib/api/admin-read";
import { isSupabaseConfigured } from "@/lib/data/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SemesterReadClient = Pick<
  Awaited<ReturnType<typeof createSupabaseServerClient>> | AdminReadClient,
  "from"
>;

export type SemestersResolved = {
  semesters: SemesterRow[];
  currentSemester: SemesterRow | null;
  source: DataSource;
};

function unavailableSemesters(): SemestersResolved {
  return { semesters: [], currentSemester: null, source: "unavailable" };
}

function mapSemesterRow(row: Record<string, unknown>): SemesterRow | null {
  const id = String(row.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    name: String(row.name ?? "").trim(),
    startsOn: String(row.starts_on ?? "").slice(0, 10),
    endsOn: String(row.ends_on ?? "").slice(0, 10),
    isCurrent: Boolean(row.is_current),
  };
}

function currentFromSemesters(semesters: SemesterRow[]): SemesterRow | null {
  return semesters.find((semester) => semester.isCurrent) ?? semesters[0] ?? null;
}

export async function fetchSemestersResolved(client?: SemesterReadClient): Promise<SemestersResolved> {
  if (!isSupabaseConfigured()) return unavailableSemesters();

  try {
    const supabase = client ?? await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("semesters")
      .select("id, name, starts_on, ends_on, is_current")
      .order("starts_on", { ascending: true });

    if (error) return unavailableSemesters();

    const semesters = ((data ?? []) as unknown as Record<string, unknown>[])
      .map(mapSemesterRow)
      .filter((row): row is SemesterRow => row !== null);

    return {
      semesters,
      currentSemester: currentFromSemesters(semesters),
      source: "remote",
    };
  } catch {
    return unavailableSemesters();
  }
}

export async function fetchCurrentSemesterResolved(client?: SemesterReadClient): Promise<{
  semester: SemesterRow | null;
  source: DataSource;
}> {
  const resolved = await fetchSemestersResolved(client);
  return { semester: resolved.currentSemester, source: resolved.source };
}

export async function fetchAdminSemestersResolved(): Promise<SemestersResolved> {
  const access = await requireAdminReadClient();
  if (!access) return unavailableSemesters();
  return fetchSemestersResolved(access.client);
}
