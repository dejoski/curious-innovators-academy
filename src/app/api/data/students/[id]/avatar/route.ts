import { NextResponse } from "next/server";
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

  const { data: visibleStudent, error: visibilityError } = await current.supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();
  if (visibilityError) {
    return NextResponse.json({ error: visibilityError.message }, { status: 400 });
  }
  if (!visibleStudent) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
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

  return NextResponse.json({ avatarUrl });
}
