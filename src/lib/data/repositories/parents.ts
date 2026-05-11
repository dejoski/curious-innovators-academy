import type { ResolvedList } from "@/lib/data/fetch-source";
import type { ParentSummary } from "@/lib/data/types";
import { isSupabaseConfigured } from "@/lib/data/env";
import { PARENTS_FALLBACK } from "@/lib/data/mock/parents";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function mapParentRow(row: Record<string, unknown>): ParentSummary | null {
  const id = Number(row.id);
  if (!Number.isFinite(id)) return null;
  return {
    id,
    name: String(row.full_name ?? row.name ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    avatar:
      row.avatar_url != null
        ? String(row.avatar_url)
        : row.avatar != null
          ? String(row.avatar)
          : undefined,
    status: row.status != null ? String(row.status) : undefined,
    studentsLabel:
      row.students_label != null
        ? String(row.students_label)
        : row.students_summary != null
          ? String(row.students_summary)
          : undefined,
  };
}

async function loadParentsResolved(): Promise<ResolvedList<ParentSummary>> {
  if (!isSupabaseConfigured()) {
    return { items: [...PARENTS_FALLBACK], source: "fallback" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("parents").select("*").order("id", { ascending: true });

    if (error) {
      return { items: [...PARENTS_FALLBACK], source: "fallback" };
    }

    if (!data?.length) {
      return { items: [], source: "remote" };
    }

    const mapped = data
      .map((row) => mapParentRow(row as Record<string, unknown>))
      .filter((x): x is ParentSummary => x !== null);

    if (mapped.length === 0) {
      return { items: [...PARENTS_FALLBACK], source: "fallback" };
    }
    return { items: mapped, source: "remote" };
  } catch {
    return { items: [...PARENTS_FALLBACK], source: "fallback" };
  }
}

/** Guardian rows for admin Parents directory */
export async function fetchParents(): Promise<ParentSummary[]> {
  const { items } = await loadParentsResolved();
  return items;
}

export async function fetchParentsResolved(): Promise<ResolvedList<ParentSummary>> {
  return loadParentsResolved();
}
