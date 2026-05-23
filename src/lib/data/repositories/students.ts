import type { DataSource, ResolvedList } from "@/lib/data/fetch-source";
import type { ProgramTrack, StudentListItem } from "@/lib/data/types";
import { canUseBundledFallbackData, fallbackList, isSupabaseConfigured } from "@/lib/data/env";
import { STUDENTS_FALLBACK } from "@/lib/data/mock/students";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function mapStudentRow(row: Record<string, unknown>): StudentListItem | null {
  if (row.id == null || String(row.id) === "") return null;

  const id = String(row.id);
  const trackRaw = String(row.track ?? row.program_track ?? "core").toLowerCase();
  const track: ProgramTrack = trackRaw === "enrichment" ? "enrichment" : "core";

  const statusRaw = String(row.core_status ?? row.schedule_status ?? row.status ?? "");
  const status: StudentListItem["status"] =
    statusRaw.toLowerCase().includes("complete") ? "Completed" : "Incomplete";

  let studentsLabel = "";
  if (row.enrichment != null) {
    studentsLabel = String(row.enrichment);
  } else if (row.enrichment_ratio != null) {
    studentsLabel = String(row.enrichment_ratio);
  }

  if (!studentsLabel && row.enrichment_completed != null && row.enrichment_total != null) {
    studentsLabel = `${row.enrichment_completed}/${row.enrichment_total}`;
  }

  return {
    id,
    name: String(row.full_name ?? row.display_name ?? row.name ?? ""),
    avatar: String(row.avatar_url ?? row.avatar ?? STUDENTS_FALLBACK[0]?.avatar ?? ""),
    parent: String(row.parent_name ?? row.guardian_label ?? row.parent ?? ""),
    level: String(row.grade_level ?? row.level ?? ""),
    status,
    enrichment: studentsLabel || "0/4",
    notes: String(row.notes ?? row.support_notes ?? ""),
    track,
  };
}

async function loadStudentsResolved(): Promise<ResolvedList<StudentListItem>> {
  if (!isSupabaseConfigured()) {
    return fallbackList(STUDENTS_FALLBACK);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("students")
      .select("id, display_name, guardian_label, level, track, profile_id, support_notes")
      .order("display_name", { ascending: true });

    if (error) {
      return fallbackList(STUDENTS_FALLBACK);
    }

    if (!data?.length) {
      return { items: [], source: "remote" };
    }

    const mapped = data
      .map((row) => mapStudentRow(row as Record<string, unknown>))
      .filter((x): x is StudentListItem => x !== null);

    if (mapped.length === 0) {
      return fallbackList(STUDENTS_FALLBACK);
    }
    return { items: mapped, source: "remote" };
  } catch {
    return fallbackList(STUDENTS_FALLBACK);
  }
}

/** Loads students for the admin students table; falls back to demo seed when offline or on error. */
export async function fetchStudents(): Promise<StudentListItem[]> {
  const { items } = await loadStudentsResolved();
  return items;
}

export async function fetchStudentsResolved(): Promise<ResolvedList<StudentListItem>> {
  return loadStudentsResolved();
}

/** Single student for profile route — Supabase row when configured, else seed row if id matches. */
export async function fetchStudentByIdResolved(
  id: string,
): Promise<{ student: StudentListItem | null; source: DataSource }> {
  const normalized = String(id).trim();
  if (!normalized) {
    return { student: null, source: "fallback" };
  }

  if (!isSupabaseConfigured()) {
    const found = STUDENTS_FALLBACK.find((s) => s.id === normalized) ?? null;
    return canUseBundledFallbackData()
      ? { student: found, source: "fallback" }
      : { student: null, source: "unavailable" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("students")
      .select("id, display_name, guardian_label, level, track, profile_id, support_notes")
      .eq("id", normalized)
      .maybeSingle();

    if (error) {
      const found = STUDENTS_FALLBACK.find((s) => s.id === normalized) ?? null;
      return canUseBundledFallbackData()
        ? { student: found, source: "fallback" }
        : { student: null, source: "unavailable" };
    }
    if (!data) {
      return { student: null, source: "remote" };
    }
    const mapped = mapStudentRow(data as Record<string, unknown>);
    if (!mapped) {
      return { student: null, source: "remote" };
    }
    return { student: mapped, source: "remote" };
  } catch {
    const found = STUDENTS_FALLBACK.find((s) => s.id === normalized) ?? null;
    return canUseBundledFallbackData()
      ? { student: found, source: "fallback" }
      : { student: null, source: "unavailable" };
  }
}
