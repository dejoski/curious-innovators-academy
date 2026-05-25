import { NextResponse } from "next/server";

import { isRemoteDataRequired, isSupabaseConfigured } from "@/lib/data/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
export type SupabaseUser = NonNullable<Awaited<ReturnType<SupabaseServerClient["auth"]["getUser"]>>["data"]["user"]>;

export type CurrentApiUserContext = {
  supabase: SupabaseServerClient | null;
  user: SupabaseUser | null;
  error: string | null;
  status: number | null;
};

function authErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

function isMissingAuthSession(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AuthSessionMissingError"
  );
}

function isAuthServiceFailure(error: unknown): boolean {
  if (!error || isMissingAuthSession(error)) return false;
  const status = authErrorStatus(error);
  return status === undefined || status === 0 || status >= 500;
}

export async function requireRemoteApiSession(): Promise<NextResponse | null> {
  if (!isRemoteDataRequired()) return null;

  const current = await loadCurrentApiUser();
  if (current.error || !current.user) {
    return NextResponse.json(
      { error: current.error ?? "Sign in required." },
      { status: current.status ?? 401 },
    );
  }

  return null;
}

export async function loadCurrentApiUser(): Promise<CurrentApiUserContext> {
  if (!isSupabaseConfigured()) {
    return { supabase: null, user: null, error: "Supabase is not configured.", status: 503 };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser().catch((err: unknown) => ({
    data: { user: null },
    error: err,
  }));

  if (isAuthServiceFailure(error)) {
    return { supabase, user: null, error: "Supabase session check failed.", status: 503 };
  }

  if (error || !user) {
    return { supabase, user: null, error: "Sign in required.", status: 401 };
  }

  return { supabase, user, error: null, status: null };
}

export async function requireCurrentApiUser(): Promise<
  | { ok: true; supabase: SupabaseServerClient; user: SupabaseUser }
  | { ok: false; response: NextResponse }
> {
  const current = await loadCurrentApiUser();
  if (!current.supabase || !current.user || current.error) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: current.error ?? "Sign in required." },
        { status: current.status ?? 401 },
      ),
    };
  }

  return { ok: true, supabase: current.supabase, user: current.user };
}
