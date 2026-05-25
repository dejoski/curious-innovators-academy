import {
  clearDemoUiBypass,
} from "@/lib/demo-login";
import { isRemoteDataRequired } from "@/lib/data/env";
import { inviteCodesMatch } from "@/lib/signup-invite";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type LoginResult = { ok: true } | { ok: false; message: string };

export type SignupResult =
  | { ok: true; kind: "demo" }
  | { ok: true; kind: "session" }
  | { ok: true; kind: "confirmation_required"; message: string }
  | { ok: false; message: string };

export type PasswordResetResult = { ok: true } | { ok: false; message: string };

const SUPABASE_AUTH_REQUIRED_MSG =
  "This deployment requires Supabase auth. Ask an administrator to configure the Supabase URL and anon key.";

/**
 * Sign in with email/password when Supabase env is set; otherwise no-op success for demo routing.
 * Clears any UI-demo bypass flag once a real session is established (client-only storage).
 */
export async function signInWithPasswordOrDemo(
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
      ? "Email or password does not match an active account. Create an account, reset the password, or ask an admin to create the user."
      : error.message;
    return { ok: false, message };
  }

  clearDemoUiBypass();

  return { ok: true };
}

export async function signInWithDemoAccount(kind: "admin" | "parent"): Promise<LoginResult> {
  try {
    const response = await fetch("/api/auth/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      message?: unknown;
      error?: unknown;
    };

    if (!response.ok) {
      const message = typeof payload.error === "string"
        ? payload.error
        : typeof payload.message === "string"
        ? payload.message
        : "Demo sign-in is not available right now.";
      return { ok: false, message };
    }

    clearDemoUiBypass();
    return { ok: true };
  } catch {
    return { ok: false, message: "Demo sign-in request failed. Please try again." };
  }
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

function passwordResetRedirectUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/reset-password`;
}

export async function requestPasswordReset(email: string): Promise<PasswordResetResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Password reset requires Supabase to be configured for this deployment.",
    };
  }

  const supabase = getBrowserSupabase();
  if (!supabase) {
    return {
      ok: false,
      message: "Password reset is unavailable because the Supabase client could not be created.",
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
      message: "Password update requires Supabase to be configured for this deployment.",
    };
  }

  const supabase = getBrowserSupabase();
  if (!supabase) {
    return {
      ok: false,
      message: "Password update is unavailable because the Supabase client could not be created.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: error.message };
  clearDemoUiBypass();
  return { ok: true };
}
