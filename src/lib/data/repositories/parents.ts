import type { ResolvedList } from "@/lib/data/fetch-source";
import type { ParentSummary } from "@/lib/data/types";
import { isSupabaseConfigured, unavailableList } from "@/lib/data/env";
import { isSupabaseAdminConfigured } from "@/lib/data/server-env";
import { firstRel } from "@/lib/data/repositories/relations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function linkedStudentsFromRow(row: Record<string, unknown>): { id: string; name: string }[] {
  const joins = Array.isArray(row.parent_students) ? row.parent_students : [];
  return joins
    .map((join) => {
      if (!join || typeof join !== "object") return null;
      const student = firstRel<Record<string, unknown>>(
        (join as { students?: unknown }).students,
      );
      const id = student?.id;
      const name = student?.display_name;
      if (id == null || name == null) return null;
      return { id: String(id), name: String(name) };
    })
    .filter((x): x is { id: string; name: string } => x !== null);
}

export function mapParentRow(row: Record<string, unknown>): ParentSummary | null {
  const id = row.id != null ? String(row.id) : "";
  if (!id) return null;
  const profile = firstRel<Record<string, unknown>>(row.profiles);
  const linkedStudents = linkedStudentsFromRow(row);
  return {
    id,
    name: String(profile?.display_name ?? row.full_name ?? row.name ?? ""),
    email: String(profile?.email ?? row.email ?? ""),
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
          : linkedStudents.length > 0
            ? linkedStudents.map((s) => s.name).join(", ")
            : undefined,
    linkedStudents,
  };
}

async function loadParentsResolved(): Promise<ResolvedList<ParentSummary>> {
  if (!isSupabaseConfigured()) {
    return unavailableList();
  }

  try {
    const supabase = isSupabaseAdminConfigured()
      ? createSupabaseAdminClient()
      : await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("parents")
      .select(
        `
        id,
        created_at,
        profiles ( display_name, email ),
        parent_students (
          students ( id, display_name )
        )
      `,
      )
      .order("created_at", { ascending: true });

    if (error) {
      return unavailableList();
    }

    if (!data?.length) {
      return { items: [], source: "remote" };
    }

    const mapped = data
      .map((row) => mapParentRow(row as Record<string, unknown>))
      .filter((x): x is ParentSummary => x !== null);

    if (mapped.length === 0) {
      return unavailableList();
    }
    return { items: mapped, source: "remote" };
  } catch {
    return unavailableList();
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
