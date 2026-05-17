import "server-only";

import { getRuntimeSupabaseUrl } from "@/lib/data/env";

function readRuntimeEnv(name: string): string | undefined {
  return (process.env as Record<string, string | undefined>)[name]?.trim() || undefined;
}

/** Server-only service role key for Auth Admin and maintenance APIs. */
export function getSupabaseServiceRoleKey(): string | undefined {
  return readRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY");
}

/** True when privileged server-only Supabase operations can run. */
export function isSupabaseAdminConfigured(): boolean {
  return Boolean(getRuntimeSupabaseUrl() && getSupabaseServiceRoleKey());
}
