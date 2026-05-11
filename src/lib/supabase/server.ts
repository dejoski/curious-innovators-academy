import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getSupabaseAnonKey,
  getSupabasePublicUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

/**
 * Server Components / Route Handlers. Call only when `isSupabaseConfigured()` is true.
 */
export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  const cookieStore = await cookies();
  const url = getSupabasePublicUrl()!;
  const anonKey = getSupabaseAnonKey()!;

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // set from Server Component without mutable cookies; middleware refreshes session.
        }
      },
    },
  });
}
