import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabasePublicUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

/**
 * Browser Supabase client. Returns null when env is missing so deploys without secrets still work (mock/demo mode).
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const url = getSupabasePublicUrl()!;
  const anonKey = getSupabaseAnonKey()!;
  return createBrowserClient(url, anonKey);
}
