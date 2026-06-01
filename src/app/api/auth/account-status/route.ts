import { NextResponse } from "next/server";
import {
  authUserIdForEmail,
  cleanAccountEmail,
  isValidAccountEmail,
} from "@/lib/data/account-materialization";
import { isSupabaseAdminConfigured } from "@/lib/data/server-env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = cleanAccountEmail(body.email);
  if (!isValidAccountEmail(email)) {
    return NextResponse.json({
      status: "invalid_email",
      message: "Enter a valid email address.",
    });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({
      status: "unknown",
      message: "Account status is unavailable. Ask an administrator to check account setup.",
    });
  }

  const admin = createSupabaseAdminClient();
  const authUserId = await authUserIdForEmail(admin, email);
  if (!authUserId) {
    return NextResponse.json({
      status: "missing_auth_user",
      message: "No login account exists for that email. Ask an administrator to save the parent record and create a new invite link.",
    });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", authUserId)
    .maybeSingle();
  if (profileError) {
    return NextResponse.json({
      status: "unknown",
      message: profileError.message,
    });
  }

  if (!profile) {
    return NextResponse.json({
      status: "missing_profile",
      message: "A login account exists, but its app profile is missing. Ask an administrator to recreate the invite link.",
    });
  }

  const role = String(profile.role ?? "");
  if (role === "parent") {
    const { data: parent } = await admin
      .from("parents")
      .select("id")
      .eq("profile_id", authUserId)
      .maybeSingle();
    if (!parent?.id) {
      return NextResponse.json({
        status: "missing_parent",
        message: "A login account exists, but it is not connected to a parent record. Ask an administrator to save the parent and create a new invite link.",
      });
    }
  }

  return NextResponse.json({
    status: "ready",
    message: "The account exists. The password is incorrect or the latest reset link was not completed.",
  });
}
