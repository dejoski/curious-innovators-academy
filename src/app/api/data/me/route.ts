import { NextResponse } from "next/server";

import {
  loadCurrentApiUser,
  requireCurrentApiUser,
  requireRemoteApiSession,
  type SupabaseServerClient,
} from "@/lib/api/require-auth";
import {
  materializeProfileRole,
  normalizeAccountDisplayName,
  normalizeAccountRole,
  upsertAccountProfile,
} from "@/lib/data/account-materialization";
import { isRemoteDataRequired } from "@/lib/data/env";

type AppRole = "admin" | "parent" | "teacher" | "student";

const DEFAULT_PREFERENCES = {
  digestWeekly: true,
  classAlerts: true,
  requestAlerts: false,
};

type AccountPreferences = typeof DEFAULT_PREFERENCES;

function normalizeRole(raw: unknown): AppRole {
  return normalizeAccountRole(raw);
}

function normalizeDisplayName(raw: unknown): string {
  return normalizeAccountDisplayName(raw);
}

function mapPreferenceRow(row: Record<string, unknown> | null | undefined): AccountPreferences {
  return {
    digestWeekly: row?.digest_weekly == null ? DEFAULT_PREFERENCES.digestWeekly : Boolean(row.digest_weekly),
    classAlerts: row?.class_alerts == null ? DEFAULT_PREFERENCES.classAlerts : Boolean(row.class_alerts),
    requestAlerts: row?.request_alerts == null ? DEFAULT_PREFERENCES.requestAlerts : Boolean(row.request_alerts),
  };
}

import { resolveDefaultStudentId } from "@/lib/api/data-shared";

export async function GET(request: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { supabase, user, error: userError } = await loadCurrentApiUser();

  if (!supabase) {
    if (isRemoteDataRequired()) {
      return NextResponse.json({ error: "Account setup is temporarily unavailable." }, { status: 503 });
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
    .select("id, email, display_name, role, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ profile: null, source: "remote" }, { status: 200 });
  }

  let accountProfile = profile;
  if (!accountProfile) {
    const displayNameFromMetadata =
      normalizeDisplayName(user.user_metadata?.full_name) ||
      normalizeDisplayName(user.user_metadata?.name) ||
      String(user.email ?? "Signed-in user").trim();
    const emailFromAuth = String(user.email ?? "").trim();
    const created = await upsertAccountProfile(supabase, {
      profileId: user.id,
      email: emailFromAuth,
      displayName: displayNameFromMetadata || "Signed-in user",
      role: "parent",
    });
    if (!created.ok) {
      return NextResponse.json({ error: created.message }, { status: 503 });
    }
    const { data: createdProfile, error: createdProfileError } = await supabase
      .from("profiles")
      .select("id, email, display_name, role, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    if (createdProfileError || !createdProfile) {
      return NextResponse.json(
        { error: createdProfileError?.message ?? "Profile setup failed." },
        { status: 503 },
      );
    }
    accountProfile = createdProfile;
  } else {
    const materialized = await materializeProfileRole(supabase, {
      profileId: user.id,
      role: normalizeRole(accountProfile.role),
    });
    if (!materialized.ok) {
      return NextResponse.json({ error: materialized.message }, { status: 503 });
    }
  }

  const role = normalizeRole(accountProfile?.role);
  const displayName = String(accountProfile?.display_name ?? user.email ?? "Signed-in user").trim() || "Signed-in user";
  const email = String(accountProfile?.email ?? user.email ?? "").trim();
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
      avatarUrl: String(accountProfile?.avatar_url ?? ""),
      defaultStudentId,
      preferences: mapPreferenceRow((preferences ?? null) as Record<string, unknown> | null),
    },
    source: "remote",
  });
}

export async function PATCH(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const current = await requireCurrentApiUser();
  if (!current.ok) return current.response;
  const { supabase, user } = current;

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
    .select("id, email, display_name, role, avatar_url")
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
      avatarUrl: String(profile.avatar_url ?? ""),
      defaultStudentId,
      preferences: mapPreferenceRow((savedPreferences ?? null) as Record<string, unknown> | null),
    },
    source: "remote",
  });
}
