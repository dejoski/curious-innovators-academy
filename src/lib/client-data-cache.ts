type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

const VERSION = "cia-client-data-v1";
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

function cacheKey(url: string) {
  return `${VERSION}:${url}`;
}

function now() {
  return Date.now();
}

function readStorage<T>(url: string): CacheEntry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(cacheKey(url));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || parsed.expiresAt <= now()) return null;
    memoryCache.set(url, parsed as CacheEntry<unknown>);
    return parsed;
  } catch {
    return null;
  }
}

function writeCache<T>(url: string, data: T, ttlMs: number) {
  const entry: CacheEntry<T> = { data, expiresAt: now() + ttlMs };
  memoryCache.set(url, entry as CacheEntry<unknown>);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(cacheKey(url), JSON.stringify(entry));
    } catch {
      /* Storage can fail in private modes; memory cache still works. */
    }
  }
  return data;
}

export function peekCachedJson<T>(url: string): T | null {
  const mem = memoryCache.get(url) as CacheEntry<T> | undefined;
  if (mem && mem.expiresAt > now()) return mem.data;
  return readStorage<T>(url)?.data ?? null;
}

export async function cachedJson<T>(url: string, ttlMs = DEFAULT_TTL_MS): Promise<T> {
  const cached = peekCachedJson<T>(url);
  if (cached) return cached;

  const existing = inFlight.get(url) as Promise<T> | undefined;
  if (existing) return existing;

  const request = fetch(url, { credentials: "same-origin" })
    .then(async (res) => {
      if (!res.ok) throw new Error(res.statusText || `Request failed: ${res.status}`);
      return (await res.json()) as T;
    })
    .then((data) => writeCache(url, data, ttlMs))
    .finally(() => inFlight.delete(url));

  inFlight.set(url, request as Promise<unknown>);
  return request;
}

export function preloadJson(url: string, ttlMs = DEFAULT_TTL_MS) {
  void cachedJson(url, ttlMs).catch(() => {
    /* Preload should never break the page. */
  });
}

export async function preloadParentDashboardData() {
  const studentsBody = await cachedJson<{ students?: { id: string }[] }>("/api/data/students").catch(() => null);
  preloadJson("/api/data/classes");
  preloadJson("/api/data/notifications");
  const firstStudentId = studentsBody?.students?.[0]?.id;
  if (firstStudentId) {
    preloadJson(`/api/data/students/${encodeURIComponent(firstStudentId)}/profile`);
    preloadJson(`/api/data/students/${encodeURIComponent(firstStudentId)}/schedule`);
  }
}

export function invalidateClientDataCache(url?: string) {
  if (url) {
    memoryCache.delete(url);
    inFlight.delete(url);
    if (typeof window !== "undefined") window.sessionStorage.removeItem(cacheKey(url));
    return;
  }
  memoryCache.clear();
  inFlight.clear();
  if (typeof window !== "undefined") {
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.startsWith(`${VERSION}:`)) window.sessionStorage.removeItem(key);
    }
  }
}
