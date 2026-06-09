import { isRemoteDataRequired } from "@/lib/data/env";
import { inviteCodesMatch } from "@/lib/signup-invite";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LoginResult = { ok: true } | { ok: false; message: string };

export type SignupResult =
  | { ok: true; kind: "demo" }
  | { ok: true; kind: "session" }
  | { ok: true; kind: "confirmation_required"; message: string }
  | { ok: false; message: string };

export type PasswordResetResult = { ok: true } | { ok: false; message: string };

const SUPABASE_AUTH_REQUIRED_MSG =
  "Sign-in is not ready yet. Ask an administrator to finish account setup.";
const ACCOUNT_PENDING_MSG =
  "Check your email to confirm your address before you can sign in. If you don't see the message, check spam or contact an administrator.";

function supabaseGuard(): LoginResult | PasswordResetResult | null {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Password setup is not ready yet. Ask an administrator to finish account setup." };
  }
  const supabase = getBrowserSupabase();
  if (!supabase) {
    return { ok: false, message: "Password setup is temporarily unavailable." };
  }
  return null;
}

function supabaseGuardOrDemo(demoKind: "demo" | "session" = "demo"): SignupResult | SupabaseClient {
  if (!isSupabaseConfigured()) {
    return isRemoteDataRequired()
      ? { ok: false, message: SUPABASE_AUTH_REQUIRED_MSG }
      : { ok: true, kind: demoKind };
  }
  const supabase = getBrowserSupabase();
  if (!supabase) {
    return isRemoteDataRequired()
      ? { ok: false, message: SUPABASE_AUTH_REQUIRED_MSG }
      : { ok: true, kind: demoKind };
  }
  return supabase;
}

async function loginCredentialMessage(email: string): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/account-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { message?: string };
    return typeof body.message === "string" && body.message.trim() ? body.message : null;
  } catch {
    return null;
  }
}

/**
 * Sign in with email/password when Supabase env is set; otherwise no-op success
 * when remote auth is intentionally unavailable.
 */
export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<LoginResult> {
  if (!isSupabaseConfigured()) {
    return isRemoteDataRequired()
      ? { ok: false, message: SUPABASE_AUTH_REQUIRED_MSG }
      : { ok: true };
  }

  const supabase = getBrowserSupabase();
  if (!supabase) {
    return isRemoteDataRequired()
      ? { ok: false, message: SUPABASE_AUTH_REQUIRED_MSG }
      : { ok: true };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const message = error.message.toLowerCase().includes("invalid login credentials")
      ? await loginCredentialMessage(email)
        ?? "Email or password does not match an active account. Create an account, reset the password, or ask an admin to create the user."
      : error.message;
    return { ok: false, message };
  }

  return { ok: true };
}

/**
 * Sign out when Supabase env is set; safe no-op when auth is not configured.
 */
export async function signOutSupabaseOrDemo(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getBrowserSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

/**
 * Validates invite code client-side, then `signUp` when Supabase env is set.
 * Without Supabase env, returns demo success only outside remote-data mode; no account is created.
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

  if (!isSupabaseConfigured()) {
    return isRemoteDataRequired()
      ? { ok: false, message: SUPABASE_AUTH_REQUIRED_MSG }
      : { ok: true, kind: "demo" };
  }

  const supabase = getBrowserSupabase();
  if (!supabase) {
    return isRemoteDataRequired()
      ? { ok: false, message: SUPABASE_AUTH_REQUIRED_MSG }
      : { ok: true, kind: "demo" };
  }

  const trimmedName = params.fullName?.trim() ?? "";

  const { data, error } = await supabase.auth.signUp({
    email: params.email.trim(),
    password: params.password,
    options: trimmedName ? { data: { full_name: trimmedName } } : {},
  });

  if (error) {
    const message = /already|registered|exists/i.test(error.message)
      ? "This email already has a parent account. Use the invite/reset link from the Parents page or reset the password instead of creating a second account."
      : error.message;
    return { ok: false, message };
  }

  if (data.session) {
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

function passwordResetRedirectUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/reset-password`;
}

export async function requestPasswordReset(email: string): Promise<PasswordResetResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Password reset is not ready yet. Ask an administrator to finish account setup.",
    };
  }

  const supabase = getBrowserSupabase();
  if (!supabase) {
    return {
      ok: false,
      message: "Password reset is temporarily unavailable.",
    };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: passwordResetRedirectUrl(),
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updateRecoveredPassword(password: string): Promise<PasswordResetResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Password update is not ready yet. Ask an administrator to finish account setup.",
    };
  }

  const supabase = getBrowserSupabase();
  if (!supabase) {
    return {
      ok: false,
      message: "Password update is temporarily unavailable.",
    };
  }

  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return { ok: false, message: error.message };
      url.searchParams.delete("code");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: error.message };
  await supabase.auth.signOut();
  return { ok: true };
}

function cleanRecoveryUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

export async function preparePasswordRecoveryFromUrl(): Promise<PasswordResetResult> {
  if (!isSupabaseConfigured()) {
    return isRemoteDataRequired()
      ? { ok: false, message: "Password setup is not ready yet. Ask an administrator to finish account setup." }
      : { ok: true };
  }

  if (typeof window === "undefined") {
    return { ok: false, message: "Open the password setup link in your browser." };
  }

  const url = new URL(window.location.href);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const code = url.searchParams.get("code");
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");

  const supabase = getBrowserSupabase();
  if (!supabase) {
    return { ok: false, message: "Password setup is temporarily unavailable." };
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { ok: false, message: error.message };
    cleanRecoveryUrl();
    return { ok: true };
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) return { ok: false, message: error.message };
    cleanRecoveryUrl();
    return { ok: true };
  }

  return {
    ok: false,
    message: "Open the latest password setup link from your email before choosing a new password.",
  };
}
