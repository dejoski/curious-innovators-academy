import "server-only";

import { isSupabaseConfigured } from "@/lib/data/env";
import { isSupabaseAdminConfigured } from "@/lib/data/server-env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ParentAccessClient = ReturnType<typeof createSupabaseAdminClient>;

export type ParentAccess = {
  client: ParentAccessClient;
  parentId: string;
  studentIds: string[];
};

export type ParentAccessDenied = {
  error: string;
  status: number;
};

export function isParentRole(raw: unknown): boolean {
  return String(raw ?? "").toLowerCase() === "parent";
}

export async function resolveParentAccess(profileId: string): Promise<ParentAccess | ParentAccessDenied> {
  const userId = profileId.trim();
  if (!userId) return { error: "Sign in required.", status: 401 };
  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) {
    return { error: "Account service setup is temporarily unavailable.", status: 503 };
  }

  const client = createSupabaseAdminClient();
  const { data: parent, error: parentError } = await client
    .from("parents")
    .select("id")
    .eq("profile_id", userId)
    .limit(1)
    .maybeSingle();

  if (parentError) return { error: "Parent account could not be loaded.", status: 503 };

  const parentId = String(parent?.id ?? "").trim();
  if (!parentId) return { error: "No parent record is linked to this account.", status: 403 };

  const { data: links, error: linksError } = await client
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", parentId);

  if (linksError) return { error: "Linked students could not be loaded.", status: 503 };

  const studentIds = Array.from(
    new Set(
      ((links ?? []) as { student_id?: unknown }[])
        .map((row) => String(row.student_id ?? "").trim())
        .filter(Boolean),
    ),
  );

  return { client, parentId, studentIds };
}

export async function requireParentStudentAccess(
  profileId: string,
  studentId: string,
): Promise<ParentAccess | ParentAccessDenied> {
  const access = await resolveParentAccess(profileId);
  if ("error" in access) return access;

  const normalizedStudentId = studentId.trim();
  if (!normalizedStudentId || !access.studentIds.includes(normalizedStudentId)) {
    return { error: "This student is not linked to the signed-in parent.", status: 403 };
  }

  return access;
}
