import { NextResponse } from "next/server";

import { isRemoteDataRequired, isSupabaseConfigured } from "@/lib/data/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
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
    return NextResponse.json({ error: "Supabase session check failed." }, { status: 503 });
  }

  if (error || !user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  return null;
}
