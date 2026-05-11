import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/data/env";

function getBaseAndKey(): { base: string; key: string } | null {
  const baseRaw = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!baseRaw || !key) return null;
  return { base: baseRaw.replace(/\/$/, ""), key };
}

function authHeaders(): Record<string, string> | null {
  const pair = getBaseAndKey();
  if (!pair) return null;
  return {
    apikey: pair.key,
    Authorization: `Bearer ${pair.key}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

/** Returns total row count via PostgREST Content-Range, or null on failure / misconfiguration. */
export async function restHeadCount(
  table: string,
  extraQuery?: string,
): Promise<number | null> {
  if (!isSupabaseConfigured()) return null;
  const h = authHeaders();
  const pair = getBaseAndKey();
  if (!h || !pair) return null;
  let path = `${pair.base}/rest/v1/${encodeURIComponent(table)}?select=id`;
  if (extraQuery && extraQuery.length > 0) {
    path += `&${extraQuery}`;
  }
  try {
    const res = await fetch(path, {
      method: "HEAD",
      headers: { ...h, Prefer: "count=exact" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const cr = res.headers.get("content-range");
    if (!cr) return null;
    const total = Number(cr.split("/").pop() ?? "");
    return Number.isFinite(total) ? total : null;
  } catch {
    return null;
  }
}

/** GET /table?select=*&... */
export async function restSelectRows<T extends Record<string, unknown>>(
  table: string,
  searchParams?: Record<string, string>,
): Promise<{ data: T[] | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error("Supabase not configured") };
  }
  const h = authHeaders();
  const pair = getBaseAndKey();
  if (!h || !pair) {
    return { data: null, error: new Error("Supabase not configured") };
  }
  const qs = new URLSearchParams({ select: "*", ...(searchParams ?? {}) });
  const url = `${pair.base}/rest/v1/${encodeURIComponent(table)}?${qs}`;
  try {
    const res = await fetch(url, { method: "GET", headers: h, cache: "no-store" });
    if (!res.ok) {
      return { data: null, error: new Error(await res.text()) };
    }
    const data = (await res.json()) as T[];
    return { data, error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: null, error: err };
  }
}
