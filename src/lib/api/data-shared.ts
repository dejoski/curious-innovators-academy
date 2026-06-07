import type { SupabaseServerClient } from "@/lib/api/require-auth";

type AppRole = "admin" | "parent" | "teacher" | "student";

export async function resolveDefaultStudentId(
  supabase: SupabaseServerClient,
  userId: string,
  role: AppRole,
): Promise<string | null> {
  if (role === "student") {
    const { data } = await supabase.from("students").select("id").eq("profile_id", userId).limit(1).maybeSingle();
    return data?.id ? String(data.id) : null;
  }

  if (role === "parent") {
    const { data: parent } = await supabase.from("parents").select("id").eq("profile_id", userId).limit(1).maybeSingle();
    if (!parent?.id) return null;
    const { data: link } = await supabase
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", parent.id)
      .limit(1)
      .maybeSingle();
    return link?.student_id ? String(link.student_id) : null;
  }

  return null;
}
