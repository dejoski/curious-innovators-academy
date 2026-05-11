import {
  clearDemoUiBypass,
} from "@/lib/demo-login";
import { inviteCodesMatch } from "@/lib/signup-invite";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type LoginResult = { ok: true } | { ok: false; message: string };

export type SignupResult =
  | { ok: true; kind: "demo" }
  | { ok: true; kind: "session" }
  | { ok: true; kind: "confirmation_required"; message: string }
  | { ok: false; message: string };

/**
 * Sign in with email/password when Supabase env is set; otherwise no-op success for demo routing.
 * Clears any UI-demo bypass flag once a real session is established (client-only storage).
 */
export async function signInWithPasswordOrDemo(
  email: string,
  password: string,
): Promise<LoginResult> {
  if (!isSupabaseConfigured()) return { ok: true };

  const supabase = getBrowserSupabase();
  if (!supabase) return { ok: true };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };

  clearDemoUiBypass();

  return { ok: true };
}

/**
 * Sign out when Supabase env is set; safe no-op when demo mode (no client).
 */
export async function signOutSupabaseOrDemo(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getBrowserSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

const ACCOUNT_PENDING_MSG =
  "Check your email to confirm your address before you can sign in. If you don't see the message, check spam or contact an administrator.";

/**
 * Validates invite code client-side, then `signUp` when Supabase env is set.
 * Without Supabase env, returns demo success (same pattern as password login) — no account is created.
 */
export async function signUpWithInviteOrDemo(params: {
  email: string;
  password: string;
  inviteCode: string;
  fullName?: string;
}): Promise<SignupResult> {
  if (!inviteCodesMatch(params.inviteCode)) {
    return { ok: false, message: "Invalid invite code." };
  }

  if (!isSupabaseConfigured()) return { ok: true, kind: "demo" };

  const supabase = getBrowserSupabase();
  if (!supabase) return { ok: true, kind: "demo" };

  const trimmedName = params.fullName?.trim() ?? "";

  const { data, error } = await supabase.auth.signUp({
    email: params.email.trim(),
    password: params.password,
    options: trimmedName ? { data: { full_name: trimmedName } } : {},
  });

  if (error) return { ok: false, message: error.message };

  if (data.session) {
    clearDemoUiBypass();
    return { ok: true, kind: "session" };
  }

  if (data.user) {
    return { ok: true, kind: "confirmation_required", message: ACCOUNT_PENDING_MSG };
  }

  return {
    ok: false,
    message: "Sign up could not be completed. Try again or contact support.",
  };
}
