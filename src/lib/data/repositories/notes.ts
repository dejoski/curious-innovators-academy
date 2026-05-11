import type { StudentNoteRecord } from "@/lib/data/types";
import { isSupabaseConfigured } from "@/lib/data/env";
import { NOTES_FALLBACK } from "@/lib/data/mock/notes";
import { restSelectRows } from "@/lib/supabase/rest";

function mapNoteRow(row: Record<string, unknown>): StudentNoteRecord | null {
  const id = String(row.id ?? "");
  if (!id) return null;
  const studentId = Number(row.student_id ?? row.studentId);
  if (!Number.isFinite(studentId)) return null;

  return {
    id,
    studentId,
    body: String(row.body ?? row.content ?? ""),
    author: String(row.author ?? ""),
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
  };
}

/** Timeline notes — empty until Supabase exposes matching rows. */
export async function fetchStudentNotes(studentId: number): Promise<StudentNoteRecord[]> {
  if (!isSupabaseConfigured()) return [...NOTES_FALLBACK];

  const { data, error } = await restSelectRows<Record<string, unknown>>(
    "student_notes",
    {
      student_id: `eq.${studentId}`,
      order: "created_at.desc",
    },
  );

  if (error || !data?.length) return [...NOTES_FALLBACK];

  const mapped = data.map(mapNoteRow).filter((x): x is StudentNoteRecord => x !== null);
  return mapped.length > 0 ? mapped : [...NOTES_FALLBACK];
}
