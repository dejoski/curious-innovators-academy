import { NextRequest, NextResponse } from "next/server";
import { dashboardHomeForPersona } from "@/lib/dashboard/role-routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/data/server-env";

export const dynamic = "force-dynamic";

function backToLogin(request: NextRequest, reason: string) {
  const response = NextResponse.redirect(new URL(`/login?auth=${reason}`, request.url), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

// Crawlers and prefetches must not start sessions.
export async function GET(request: NextRequest) {
  return backToLogin(request, "required");
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Use the demo sign-in page." }, { status: 403 });
  }
  if (process.env.DEMO_MODE !== "true" || !isSupabaseAdminConfigured()) {
    return backToLogin(request, "configuration");
  }
  const body = await request.formData().catch(() => null);
  const kind = body?.get("kind");
  if (kind !== "admin" && kind !== "parent" && kind !== "teacher") {
    return NextResponse.json({ error: "Choose a demo role." }, { status: 400 });
  }
  // Visitors supply a role, never an email, user ID, redirect, or privilege.
  const email = process.env[`DEMO_${kind.toUpperCase()}_EMAIL`]?.trim() || `demo.${kind}@example.com`;
  try {
    const admin = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("id, role").eq("email", email).eq("role", kind).maybeSingle();
    if (profileError || !profile) return backToLogin(request, "configuration");
    const { data: account, error: accountError } = await admin.auth.admin.getUserById(profile.id);
    if (accountError || account.user?.app_metadata?.demo !== true) return backToLogin(request, "configuration");
    // Consume the one-time token on the server. No email is sent.
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (linkError || !link.properties?.hashed_token) return backToLogin(request, "failed");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
    if (error || data.user?.id !== profile.id) return backToLogin(request, "failed");
    const response = NextResponse.redirect(new URL(dashboardHomeForPersona(kind), request.url), 303);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return backToLogin(request, "failed");
  }
}
