import { NextResponse } from "next/server";
import { requireCurrentApiUser, requireRemoteApiSession } from "@/lib/api/require-auth";
import { handleAvatarUpload } from "@/lib/api/avatar-upload";

export async function POST(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const current = await requireCurrentApiUser();
  if (!current.ok) return current.response;

  return handleAvatarUpload(req, current.user.id, "profiles", "profile-avatars");
}
