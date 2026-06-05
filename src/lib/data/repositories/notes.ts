import type { StudentNoteRecord } from "@/lib/data/types";
import { isSupabaseConfigured } from "@/lib/data/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function mapNoteRow(row: Record<string, unknown>): StudentNoteRecord | null {
  const id = String(row.id ?? "");
  if (!id) return null;
  const studentId = String(row.student_id ?? row.studentId ?? "");
  if (!studentId) return null;
  const profiles = row.profiles as Record<string, unknown> | Record<string, unknown>[] | null;
  const profile = Array.isArray(profiles) ? profiles[0] : profiles;
  const authorName =
    profile && typeof profile === "object"
      ? String(profile.display_name ?? "")
      : String(row.author ?? "");

  return {
    id,
    studentId,
    body: String(row.body ?? row.content ?? ""),
    author: authorName,
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
  };
}

function _notesStub() {}

async function _studentNotesFetch(studentId: string): Promise<StudentNoteRecord[]> {
  if (!studentId) return [];
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("student_records")
      .select("id,student_id,body,created_at,profiles(display_name)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error || !data?.length) return [];

    const mapped = (data as Record<string, unknown>[])
      .map(mapNoteRow)
      .filter((x): x is StudentNoteRecord => x !== null);
    return mapped;
  } catch {
    return [];
  }
}
