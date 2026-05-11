/**
 * Supabase project URL (Vercel often provides NEXT_PUBLIC_*; some setups use server-only SUPABASE_URL).
 */
export function getSupabaseUrl(): string | undefined {
  const v =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  return v || undefined;
}

/** Anon / publishable key used with RLS (never the service role). */
export function getSupabaseAnonKey(): string | undefined {
  const v =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();
  return v || undefined;
}

/** True when URL and anon key are present for server/API usage. */
export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
