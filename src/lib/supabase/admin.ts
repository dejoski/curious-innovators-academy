import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getRuntimeSupabaseUrl } from "@/lib/data/env";
import {
  getSupabaseServiceRoleKey,
  isSupabaseAdminConfigured,
} from "@/lib/data/server-env";

/**
 * Server-only Supabase Admin client. This must never be imported from a client
 * component because it uses SUPABASE_SERVICE_ROLE_KEY.
 */
export function createSupabaseAdminClient() {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin env missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(getRuntimeSupabaseUrl()!, getSupabaseServiceRoleKey()!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
