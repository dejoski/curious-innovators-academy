import { NextResponse } from "next/server";

import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { isRemoteDataRequired, isSupabaseConfigured } from "@/lib/data/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AppRole = "admin" | "parent" | "teacher" | "student";

const DEFAULT_PREFERENCES = {
  digestWeekly: true,
  classAlerts: true,
  requestAlerts: false,
};

type AccountPreferences = typeof DEFAULT_PREFERENCES;

function normalizeRole(raw: unknown): AppRole {
  const role = String(raw ?? "").toLowerCase();
  if (role === "parent" || role === "teacher" || role === "student") return role;
  return "admin";
}

function normalizeDisplayName(raw: unknown): string {
  return String(raw ?? "").trim().replace(/\s+/g, " ");
}

function mapPreferenceRow(row: Record<string, unknown> | null | undefined): AccountPreferences {
  return {
    digestWeekly: row?.digest_weekly == null ? DEFAULT_PREFERENCES.digestWeekly : Boolean(row.digest_weekly),
    classAlerts: row?.class_alerts == null ? DEFAULT_PREFERENCES.classAlerts : Boolean(row.class_alerts),
    requestAlerts: row?.request_alerts == null ? DEFAULT_PREFERENCES.requestAlerts : Boolean(row.request_alerts),
  };
}

async function resolveDefaultStudentId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
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

async function loadCurrentUser() {
  if (!isSupabaseConfigured()) {
    return { supabase: null, user: null, error: "Supabase is not configured." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, error: "Sign in required." };
  }

  return { supabase, user, error: null };
}

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { supabase, user, error: userError } = await loadCurrentUser();

  if (!supabase) {
    if (isRemoteDataRequired()) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
    }
    return NextResponse.json({ profile: null, source: "unavailable" });
  }

  if (userError || !user) {
    if (isRemoteDataRequired()) {
      return NextResponse.json({ error: userError ?? "Sign in required." }, { status: 401 });
    }
    return NextResponse.json({ profile: null, source: "remote" });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ profile: null, source: "remote" }, { status: 200 });
  }

  const role = normalizeRole(profile?.role);
  const displayName = String(profile?.display_name ?? user.email ?? "Signed-in user").trim() || "Signed-in user";
  const email = String(profile?.email ?? user.email ?? "").trim();
  const defaultStudentId = await resolveDefaultStudentId(supabase, user.id, role);
  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("digest_weekly, class_alerts, request_alerts")
    .eq("profile_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    profile: {
      id: user.id,
      displayName,
      email,
      role,
      defaultStudentId,
      preferences: mapPreferenceRow((preferences ?? null) as Record<string, unknown> | null),
    },
    source: "remote",
  });
}

export async function PATCH(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { supabase, user, error: userError } = await loadCurrentUser();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  if (userError || !user) {
    return NextResponse.json({ error: userError ?? "Sign in required." }, { status: 401 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const displayName = normalizeDisplayName(body.displayName);
  if (displayName.length < 2 || displayName.length > 120) {
    return NextResponse.json({ error: "Display name must be between 2 and 120 characters." }, { status: 400 });
  }

  const preferencesInput = body.preferences as Partial<Record<keyof AccountPreferences, unknown>> | undefined;
  const preferences = {
    digest_weekly:
      preferencesInput?.digestWeekly == null ? DEFAULT_PREFERENCES.digestWeekly : Boolean(preferencesInput.digestWeekly),
    class_alerts:
      preferencesInput?.classAlerts == null ? DEFAULT_PREFERENCES.classAlerts : Boolean(preferencesInput.classAlerts),
    request_alerts:
      preferencesInput?.requestAlerts == null ? DEFAULT_PREFERENCES.requestAlerts : Boolean(preferencesInput.requestAlerts),
  };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id)
    .select("id, email, display_name, role")
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? "Profile update failed." }, { status: 400 });
  }

  const { data: savedPreferences, error: preferencesError } = await supabase
    .from("user_preferences")
    .upsert({
      profile_id: user.id,
      ...preferences,
    })
    .select("digest_weekly, class_alerts, request_alerts")
    .maybeSingle();

  if (preferencesError) {
    return NextResponse.json({ error: preferencesError.message }, { status: 400 });
  }

  const role = normalizeRole(profile.role);
  const defaultStudentId = await resolveDefaultStudentId(supabase, user.id, role);

  return NextResponse.json({
    profile: {
      id: user.id,
      displayName: String(profile.display_name ?? displayName),
      email: String(profile.email ?? user.email ?? ""),
      role,
      defaultStudentId,
      preferences: mapPreferenceRow((savedPreferences ?? null) as Record<string, unknown> | null),
    },
    source: "remote",
  });
}
