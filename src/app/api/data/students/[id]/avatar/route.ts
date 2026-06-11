import { NextResponse } from "next/server";
import { isParentRole, requireParentStudentAccess } from "@/lib/api/parent-access";
import { requireCurrentApiUser, requireRemoteApiSession } from "@/lib/api/require-auth";
import { isSupabaseAdminConfigured } from "@/lib/data/server-env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

const BUCKET = "student-avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

async function writeAvatarAudit(
  supabase: any,
  actorId: string,
  studentId: string,
  avatarUrl: string,
) {
  try {
    if (!supabase || !actorId) return;
    await supabase.from("audit_events").insert({
      actor_profile_id: actorId,
      action: "student.avatar.update",
      entity_type: "student",
      entity_id: studentId,
      metadata: { avatarUrl },
    });
  } catch {
    /* Audit writes should not block the primary workflow. */
  }
}

export async function POST(req: Request, context: RouteContext) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { id } = await context.params;
  const studentId = id.trim();
  if (!studentId) {
    return NextResponse.json({ error: "Missing student id." }, { status: 400 });
  }

  const current = await requireCurrentApiUser();
  if (!current.ok) return current.response;

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Photo uploads are temporarily unavailable." }, { status: 503 });
  }

  const { data: profile } = await current.supabase
    .from("profiles")
    .select("role")
    .eq("id", current.user.id)
    .maybeSingle();
  const role = String(profile?.role ?? "").toLowerCase();
  if (isParentRole(role)) {
    const access = await requireParentStudentAccess(current.user.id, studentId);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
  } else if (role !== "admin") {
    return NextResponse.json({ error: "Only linked parents or administrators can update this student photo." }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
  }
  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension) {
    return NextResponse.json({ error: "Use a JPG, PNG, WEBP, or GIF image." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: "Photo must be smaller than 2 MB." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const bucketCreate = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: `${MAX_AVATAR_BYTES}`,
    allowedMimeTypes: Array.from(ALLOWED_TYPES.keys()),
  });
  if (bucketCreate.error && !/already exists/i.test(bucketCreate.error.message)) {
    return NextResponse.json({ error: bucketCreate.error.message }, { status: 400 });
  }

  const path = `${studentId}/${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const upload = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) {
    return NextResponse.json({ error: upload.error.message }, { status: 400 });
  }

  const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(path);
  const avatarUrl = publicData.publicUrl;
  const { error: updateError } = await admin
    .from("students")
    .update({ avatar_url: avatarUrl })
    .eq("id", studentId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  await writeAvatarAudit(current.supabase, current.user.id, studentId, avatarUrl);

  return NextResponse.json({ avatarUrl });
}
