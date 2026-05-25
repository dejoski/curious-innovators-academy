import { signOutSupabaseOrDemo } from "@/lib/supabase/auth-bridge";

/**
 * Call after Supabase sign-out (or demo no-op), then navigate to login.
 * Pass the object returned from `useRouter()`.
 */
export async function logoutThenLogin(router: { push: (href: string) => void }): Promise<void> {
  await signOutSupabaseOrDemo();
  router.push("/login");
}
