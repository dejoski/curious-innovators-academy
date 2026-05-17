/**
 * Re-exports shared Supabase env resolution (NEXT_PUBLIC_* with optional server-only fallbacks).
 * Never commit or expose SUPABASE_SERVICE_ROLE_KEY to the frontend.
 */
import {
  getSupabaseAnonKey as getAnon,
  getSupabaseUrl as getUrl,
  isSupabaseConfigured as runtimeConfigured,
} from "@/lib/data/env";

export function getSupabasePublicUrl(): string | undefined {
  return getUrl();
}

export function getSupabaseAnonKey(): string | undefined {
  return getAnon();
}

export function isSupabaseConfigured(): boolean {
  if (typeof window === "undefined") return runtimeConfigured();
  return Boolean(getUrl() && getAnon());
}
