import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { getRuntimeSupabaseUrl, isSupabaseConfigured } from "@/lib/data/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redactedHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return "invalid-url";
  }
}

/**
 * Safe diagnostics for `/api/data/*` — no secrets. Helps verify env + session without exposing keys.
 */
export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const configured = isSupabaseConfigured();
  const urlHost = redactedHost(getRuntimeSupabaseUrl());

  let authUserPresent = false;
  let sessionError: string | null = null;
  if (configured) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.getUser();
      if (error) sessionError = error.message;
      authUserPresent = Boolean(data.user?.id);
    } catch (e) {
      sessionError = e instanceof Error ? e.message : "session_check_failed";
    }
  }

  return NextResponse.json({
    configured,
    urlHost,
    authUserPresent,
    sessionError: sessionError && !authUserPresent ? sessionError : null,
    hint:
      configured && !authUserPresent
        ? "Data APIs use the browser session; sign in so RLS allows reads."
        : configured
          ? "Session present; list endpoints should use source: remote when rows exist and RLS permits."
          : "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY on the server).",
  });
}
