import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import {
  cleanAccountEmail,
  materializeProfileRole,
} from "@/lib/data/account-materialization";
import { isSupabaseConfigured } from "@/lib/data/env";
import { isSupabaseAdminConfigured } from "@/lib/data/server-env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ROLES = ["admin", "parent", "teacher"] as const;
type AppRole = (typeof ROLES)[number];

function normalizeRole(raw: unknown): AppRole | null {
  const role = String(raw ?? "").toLowerCase();
  return ROLES.includes(role as AppRole) ? (role as AppRole) : null;
}

function cleanEmail(raw: unknown): string {
  return cleanAccountEmail(raw);
}

async function requireAdmin() {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, status: 503, message: "Account setup is temporarily unavailable." };
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false as const, status: 401, message: "Sign in as an administrator." };
  }
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    return { ok: false as const, status: 403, message: error.message };
  }
  if (profile?.role !== "admin") {
    return { ok: false as const, status: 403, message: "Administrator role required." };
  }
  return { ok: true as const, userId: user.id };
}

export async function POST(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Account setup is temporarily unavailable.",
      },
      { status: 503 },
    );
  }

  const body = (await req.json()) as Record<string, unknown>;
  const email = cleanEmail(body.email);
  const displayName = String(body.displayName ?? "").trim();
  const role = normalizeRole(body.role);
  const password = String(body.password ?? "");
  const sendInvite = body.sendInvite !== false;
  const origin = new URL(req.url).origin;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }
  if (!displayName) {
    return NextResponse.json({ error: "Display name is required." }, { status: 400 });
  }
  if (!role) {
    return NextResponse.json({ error: "Choose administrator, parent, or teacher." }, { status: 400 });
  }
  if (!sendInvite && password.length < 8) {
    return NextResponse.json(
      { error: "Temporary password must be at least 8 characters, or send an invite email." },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const userResult = sendInvite
    ? await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: displayName },
        redirectTo: `${origin}/reset-password`,
      })
    : await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: displayName },
      });

  if (userResult.error || !userResult.data.user) {
    return NextResponse.json(
      { error: userResult.error?.message ?? "Account setup could not be completed." },
      { status: 400 },
    );
  }

  const user = userResult.data.user;
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      role,
      display_name: displayName,
      email,
    },
    { onConflict: "id" },
  );
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }
  const materialized = await materializeProfileRole(admin, { profileId: user.id, role });
  if (!materialized.ok) {
    return NextResponse.json({ error: materialized.message }, { status: 400 });
  }

  await admin.from("audit_events").insert({
    actor_profile_id: auth.userId,
    action: sendInvite ? "user.invite" : "user.create",
    entity_type: "profile",
    entity_id: user.id,
    metadata: { email, role, displayName },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email,
      displayName,
      role,
      invited: sendInvite,
    },
  });
}
