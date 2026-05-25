import "server-only";

import { isSupabaseConfigured } from "@/lib/data/env";
import { isSupabaseAdminConfigured } from "@/lib/data/server-env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminReadClient = ReturnType<typeof createSupabaseAdminClient>;

export type AdminReadAccess = {
  client: AdminReadClient;
  userId: string;
};

function isAdminRole(raw: unknown): boolean {
  return String(raw ?? "").toLowerCase() === "admin";
}

function isNextDynamicServerError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const digest = "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";
  return error.message.includes("Dynamic server usage") || digest.includes("DYNAMIC_SERVER_USAGE");
}

export async function requireAdminReadClient(): Promise<AdminReadAccess | null> {
  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) return null;

  try {
    const sessionClient = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await sessionClient.auth.getUser();
    if (userError || !user?.id) return null;

    const { data: profile, error: profileError } = await sessionClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !isAdminRole(profile?.role)) return null;

    return {
      client: createSupabaseAdminClient(),
      userId: user.id,
    };
  } catch (error) {
    if (isNextDynamicServerError(error)) throw error;
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : "unknown admin read error";
    console.warn(`admin-read: unavailable; reason=${reason}`);
    return null;
  }
}
