import type { ResolvedList } from "@/lib/data/fetch-source";
import type { TeacherRow } from "@/lib/data/types";
import { requireAdminReadClient, type AdminReadClient } from "@/lib/api/admin-read";
import { isSupabaseConfigured, unavailableList } from "@/lib/data/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TeacherReadClient = Awaited<ReturnType<typeof createSupabaseServerClient>> | AdminReadClient;

export function mapTeacherRow(row: Record<string, unknown>): TeacherRow | null {
  if (row.id == null || String(row.id) === "") return null;

  const id = String(row.id);
  const prog = String(row.program ?? row.track ?? "core").toLowerCase();
  const program: TeacherRow["program"] = prog === "enrichment" ? "enrichment" : "core";

  const profiles = row.profiles as Record<string, unknown> | Record<string, unknown>[] | null;
  const p = Array.isArray(profiles) ? profiles[0] : profiles;
  const displayName =
    p && typeof p === "object" && p !== null
      ? String((p as { display_name?: unknown }).display_name ?? "")
      : "";
  const email =
    p && typeof p === "object" && p !== null
      ? String((p as { email?: unknown }).email ?? "")
      : "";

  return {
    id,
    name: String(row.full_name ?? displayName ?? row.name ?? ""),
    subjects: String(row.subjects ?? row.subject_areas ?? ""),
    email: String(row.email ?? email ?? ""),
    phone: String(row.phone ?? ""),
    avatar: String(row.avatar_url ?? row.avatar ?? ""),
    program,
  };
}

async function loadTeachersResolved(client?: TeacherReadClient): Promise<ResolvedList<TeacherRow>> {
  if (!isSupabaseConfigured()) {
    return unavailableList();
  }

  try {
    const supabase = client ?? await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("teachers")
      .select("id, subjects, phone, program, profiles ( display_name, email )")
      .order("created_at", { ascending: true });

    if (error) {
      return unavailableList();
    }

    if (!data?.length) {
      return { items: [], source: "remote" };
    }

    const mapped = data
      .map((row) => mapTeacherRow(row as unknown as Record<string, unknown>))
      .filter((x): x is TeacherRow => x !== null);

    if (mapped.length === 0) {
      return unavailableList();
    }
    return { items: mapped, source: "remote" };
  } catch {
    return unavailableList();
  }
}

/** Teachers directory. */
export async function fetchTeachers(): Promise<TeacherRow[]> {
  const { items } = await loadTeachersResolved();
  return items;
}

export async function fetchTeachersResolved(): Promise<ResolvedList<TeacherRow>> {
  return loadTeachersResolved();
}

export async function fetchAdminTeachersResolved(): Promise<ResolvedList<TeacherRow>> {
  const access = await requireAdminReadClient();
  if (!access) return unavailableList();
  return loadTeachersResolved(access.client);
}
