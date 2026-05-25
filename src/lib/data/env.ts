function normalizeSupabaseUrl(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  try {
    const parsed = new URL(v);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return undefined;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function readRuntimeEnv(name: string): string | undefined {
  return (process.env as Record<string, string | undefined>)[name]?.trim() || undefined;
}

/**
 * Supabase project URL for public/client code. Next.js can inline NEXT_PUBLIC_* at build time.
 */
export function getSupabaseUrl(): string | undefined {
  return normalizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim(),
  );
}

/** Anon / publishable key used with RLS (never the service role). */
export function getSupabaseAnonKey(): string | undefined {
  const v =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();
  return v || undefined;
}

/**
 * Runtime Supabase URL for server/proxy code. Uses dynamic env access so checks can
 * detect missing runtime configuration even after a production build was made.
 */
export function getRuntimeSupabaseUrl(): string | undefined {
  return normalizeSupabaseUrl(
    readRuntimeEnv("SUPABASE_URL") || readRuntimeEnv("NEXT_PUBLIC_SUPABASE_URL"),
  );
}

/** Runtime anon / publishable key for server/proxy code. */
export function getRuntimeSupabaseAnonKey(): string | undefined {
  return (
    readRuntimeEnv("SUPABASE_ANON_KEY") ||
    readRuntimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    undefined
  );
}

/** True when runtime URL and anon key are present for server/API usage. */
export function isSupabaseConfigured(): boolean {
  return Boolean(getRuntimeSupabaseUrl() && getRuntimeSupabaseAnonKey());
}

/**
 * Remote data is mandatory. Missing env or failed queries must not render
 * placeholder rows.
 */
export function isRemoteDataRequired(): boolean {
  return true;
}

export function unavailableList<T>(): import("./fetch-source").ResolvedList<T> {
  return { items: [], source: "unavailable" };
}
