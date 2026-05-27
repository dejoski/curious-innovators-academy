import { signOutSupabaseOrDemo } from "@/lib/supabase/auth-bridge";
import { invalidateClientDataCache } from "@/lib/client-data-cache";

/**
 * Call after Supabase sign-out (or demo no-op), then navigate to login.
 * Pass the object returned from `useRouter()`.
 */
export async function logoutThenLogin(router: { push: (href: string) => void }): Promise<void> {
  await signOutSupabaseOrDemo();
  invalidateClientDataCache();
  router.push("/login");
}
