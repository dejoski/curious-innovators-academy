import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getRuntimeSupabaseAnonKey,
  getRuntimeSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/data/env";

/**
 * Server Components / Route Handlers. Call only when `isSupabaseConfigured()` is true.
 */
export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Account service setup is missing.",
    );
  }
  const cookieStore = await cookies();
  const url = getRuntimeSupabaseUrl()!;
  const anonKey = getRuntimeSupabaseAnonKey()!;

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
