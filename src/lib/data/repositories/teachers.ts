import type { ResolvedList } from "@/lib/data/fetch-source";
import type { TeacherRow } from "@/lib/data/types";
import { requireAdminReadClient, type AdminReadClient } from "@/lib/api/admin-read";
import { isSupabaseConfigured, unavailableList } from "@/lib/data/env";
import { firstRel } from "@/lib/data/repositories/relations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TeacherReadClient = Awaited<ReturnType<typeof createSupabaseServerClient>> | AdminReadClient;

export function mapTeacherRow(row: Record<string, unknown>): TeacherRow | null {
  if (row.id == null || String(row.id) === "") return null;

  const id = String(row.id);
  const classRows = Array.isArray(row.classes) ? (row.classes as Record<string, unknown>[]) : [];
  const subjectClasses = Array.from(
    new Set(
      classRows
        .map((classRow) => String(classRow.name ?? "").trim())
        .filter((name) => name.length > 0),
    ),
  );
  const coreClassCount = classRows.filter((classRow) => String(classRow.program ?? "").toLowerCase() !== "enrichment").length;
  const enrichmentClassCount = classRows.filter((classRow) => String(classRow.program ?? "").toLowerCase() === "enrichment").length;
  const prog = String(row.program ?? row.track ?? "core").toLowerCase();
  const program: TeacherRow["program"] =
    enrichmentClassCount > 0 && coreClassCount === 0
      ? "enrichment"
      : coreClassCount > 0
        ? "core"
        : prog === "enrichment"
          ? "enrichment"
          : "core";

  const p = firstRel<Record<string, unknown>>(row.profiles);
  const displayName =
    p && typeof p === "object" && p !== null
      ? String((p as { display_name?: unknown }).display_name ?? "")
      : "";
  const email =
    p && typeof p === "object" && p !== null
      ? String((p as { email?: unknown }).email ?? "")
      : "";
  const avatarUrl =
    p && typeof p === "object" && p !== null
      ? String((p as { avatar_url?: unknown }).avatar_url ?? "")
      : "";

  return {
    id,
    name: String(row.full_name ?? displayName ?? row.name ?? ""),
    subjects: subjectClasses.length ? subjectClasses.join(", ") : "No classes assigned",
    subjectClasses,
    classCount: subjectClasses.length,
    coreClassCount,
    enrichmentClassCount,
    email: String(row.email ?? email ?? ""),
    phone: String(row.phone ?? ""),
    avatar: avatarUrl || String(row.avatar_url ?? row.avatar ?? ""),
    program,
  };
}

async function loadTeachersResolved(client?: TeacherReadClient): Promise<ResolvedList<TeacherRow>> {
  if (!isSupabaseConfigured()) {
    return unavailableList();
  }

  try {
    const supabase = client ?? await createSupabaseServerClient();
    const [teachersResult, classesResult] = await Promise.all([
      supabase
        .from("teachers")
        .select("id, subjects, phone, program, profiles ( display_name, email, avatar_url )")
        .order("created_at", { ascending: true }),
      supabase
        .from("classes")
        .select("id, teacher_id, name, program")
        .order("name", { ascending: true }),
    ]);

    if (teachersResult.error || classesResult.error) {
      return unavailableList();
    }

    const data = teachersResult.data;
    if (!data?.length) {
      return { items: [], source: "remote" };
    }

    const classesByTeacherId = new Map<string, Record<string, unknown>[]>();
    for (const classRow of (classesResult.data ?? []) as unknown as Record<string, unknown>[]) {
      const teacherId = String(classRow.teacher_id ?? "");
      if (!teacherId) continue;
      const rows = classesByTeacherId.get(teacherId) ?? [];
      rows.push(classRow);
      classesByTeacherId.set(teacherId, rows);
    }

    const mapped = data
      .map((row) => {
        const teacherRow = row as unknown as Record<string, unknown>;
        const id = String(teacherRow.id ?? "");
        return mapTeacherRow({
          ...teacherRow,
          classes: classesByTeacherId.get(id) ?? [],
        });
      })
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
