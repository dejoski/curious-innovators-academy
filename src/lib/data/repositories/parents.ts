import type { ResolvedList } from "@/lib/data/fetch-source";
import type { ParentSummary } from "@/lib/data/types";
import { requireAdminReadClient, type AdminReadClient } from "@/lib/api/admin-read";
import { isSupabaseConfigured, unavailableList } from "@/lib/data/env";
import { firstRel } from "@/lib/data/repositories/relations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ParentReadClient = Awaited<ReturnType<typeof createSupabaseServerClient>> | AdminReadClient;

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
  const explicitStatus = String(row.status ?? "").trim();
  return {
    id,
    name: String(profile?.display_name ?? row.full_name ?? row.name ?? ""),
    email: String(profile?.email ?? row.email ?? ""),
    phone: String(row.phone ?? ""),
    avatar:
      profile?.avatar_url != null
        ? String(profile.avatar_url)
        : row.avatar_url != null
          ? String(row.avatar_url)
        : row.avatar != null
          ? String(row.avatar)
          : undefined,
    status: explicitStatus || (linkedStudents.length > 0 ? "Active" : "Needs students"),
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

async function loadParentsResolved(client?: ParentReadClient): Promise<ResolvedList<ParentSummary>> {
  if (!isSupabaseConfigured()) {
    return unavailableList();
  }

  try {
    const supabase = client ?? await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("parents")
      .select(
        `
        id,
        created_at,
        profiles ( display_name, email, avatar_url ),
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

function _parentsHelpers() {}

export async function fetchAdminParentsResolved(): Promise<ResolvedList<ParentSummary>> {
  const access = await requireAdminReadClient();
  if (!access) return unavailableList();
  return loadParentsResolved(access.client);
}
