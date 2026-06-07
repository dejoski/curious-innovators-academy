import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/data/server-env";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export async function handleAvatarUpload(req: Request, ownerId: string, table: string, bucket: string) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Photo uploads are temporarily unavailable." }, { status: 503 });
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
  const bucketCreate = await admin.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: `${MAX_AVATAR_BYTES}`,
    allowedMimeTypes: Array.from(ALLOWED_TYPES.keys()),
  });
  if (bucketCreate.error && !/already exists/i.test(bucketCreate.error.message)) {
    return NextResponse.json({ error: bucketCreate.error.message }, { status: 400 });
  }

  const path = `${ownerId}/${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const upload = await admin.storage.from(bucket).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) {
    return NextResponse.json({ error: upload.error.message }, { status: 400 });
  }

  const { data: publicData } = admin.storage.from(bucket).getPublicUrl(path);
  const avatarUrl = publicData.publicUrl;
  const { error: updateError } = await admin
    .from(table)
    .update({ avatar_url: avatarUrl })
    .eq("id", ownerId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ avatarUrl });
}
