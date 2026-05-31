type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

const VERSION = "cia-client-data-v13";
const INVALIDATION_STORAGE_KEY = `${VERSION}:invalidation`;
export const DASHBOARD_CACHE_INVALIDATED_EVENT = "cia-dashboard-cache-invalidated";
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();
let cacheScope = "default";

export const ADMIN_HOME_DATA_URLS = [
  "/api/dashboard-presentation",
  "/api/data/semesters",
  "/api/data/notifications",
  "/api/data/enrichment-requests",
] as const;

function cacheKey(url: string) {
  return `${VERSION}:${cacheScope}:${url}`;
}

function scopedKey(url: string) {
  return `${cacheScope}:${url}`;
}

function now() {
  return Date.now();
}

function isUnavailablePayload(data: unknown): boolean {
  return Boolean(
    data &&
      typeof data === "object" &&
      "source" in data &&
      (data as { source?: unknown }).source === "unavailable",
  );
}

function readStorage<T>(url: string): CacheEntry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(cacheKey(url));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || parsed.expiresAt <= now()) return null;
    memoryCache.set(scopedKey(url), parsed as CacheEntry<unknown>);
    return parsed;
  } catch {
    return null;
  }
}

function writeCache<T>(url: string, data: T, ttlMs: number) {
  if (isUnavailablePayload(data)) {
    clearLocalCache(url);
    return data;
  }
  const entry: CacheEntry<T> = { data, expiresAt: now() + ttlMs };
  memoryCache.set(scopedKey(url), entry as CacheEntry<unknown>);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(cacheKey(url), JSON.stringify(entry));
    } catch {
      /* Storage can fail in private modes; memory cache still works. */
    }
  }
  return data;
}

function clearLocalCache(url?: string) {
  if (url) {
    const key = scopedKey(url);
    memoryCache.delete(key);
    inFlight.delete(key);
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

function dispatchInvalidationEvent(url?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(DASHBOARD_CACHE_INVALIDATED_EVENT, {
      detail: { scope: cacheScope, url: url ?? null },
    }),
  );
}

function broadcastInvalidation(url?: string) {
  if (typeof window === "undefined") return;
  dispatchInvalidationEvent(url);
  try {
    window.localStorage.setItem(
      INVALIDATION_STORAGE_KEY,
      JSON.stringify({
        scope: cacheScope,
        url: url ?? null,
        at: Date.now(),
      }),
    );
  } catch {
    /* Cross-tab cache sync is best-effort; local invalidation already happened. */
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== INVALIDATION_STORAGE_KEY || !event.newValue) return;
    try {
      const payload = JSON.parse(event.newValue) as { scope?: string; url?: string | null };
      if (payload.scope && payload.scope !== cacheScope) return;
      const url = typeof payload.url === "string" ? payload.url : undefined;
      clearLocalCache(url);
      dispatchInvalidationEvent(url);
    } catch {
      clearLocalCache();
      dispatchInvalidationEvent();
    }
  });
}

export function peekCachedJson<T>(url: string): T | null {
  const key = scopedKey(url);
  const mem = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (mem && mem.expiresAt > now()) return mem.data;
  return readStorage<T>(url)?.data ?? null;
}

export async function cachedJson<T>(url: string, ttlMs = DEFAULT_TTL_MS): Promise<T> {
  const cached = peekCachedJson<T>(url);
  if (cached && !isUnavailablePayload(cached)) return cached;
  if (cached) clearLocalCache(url);

  const key = scopedKey(url);
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const request = fetch(url, { credentials: "same-origin" })
    .then(async (res) => {
      if (!res.ok) throw new Error(res.statusText || `Request failed: ${res.status}`);
      return (await res.json()) as T;
    })
    .then((data) => writeCache(url, data, ttlMs))
    .finally(() => inFlight.delete(key));

  inFlight.set(key, request as Promise<unknown>);
  return request;
}

export function preloadJson(url: string, ttlMs = DEFAULT_TTL_MS) {
  void cachedJson(url, ttlMs).catch(() => {
    /* Preload should never break the page. */
  });
}

export function parentStudentDataUrls(studentId: string) {
  const encodedId = encodeURIComponent(studentId);
  return [
    `/api/data/students/${encodedId}/profile`,
    `/api/data/students/${encodedId}/schedule`,
  ] as const;
}

export function studentDetailDataUrls(studentId: string) {
  const encodedId = encodeURIComponent(studentId);
  return [
    `/api/data/students/${encodedId}/profile`,
    `/api/data/students/${encodedId}/schedule`,
    `/api/data/students/${encodedId}/roster`,
  ] as const;
}

export function preloadParentStudentData(studentId: string) {
  for (const url of parentStudentDataUrls(studentId)) preloadJson(url);
}

export function preloadStudentDetailData(studentId: string) {
  for (const url of studentDetailDataUrls(studentId)) preloadJson(url);
}

export function preloadAdminHomeData() {
  for (const url of ADMIN_HOME_DATA_URLS) preloadJson(url);
}

export async function preloadParentDashboardData(): Promise<{ ok: boolean; studentIds: string[] }> {
  let studentsOk = true;
  const studentsBody = await cachedJson<{ students?: { id: string }[] }>("/api/data/students").catch(() => {
    studentsOk = false;
    return null;
  });
  const studentIds = (studentsBody?.students ?? [])
    .map((student) => String(student.id ?? "").trim())
    .filter(Boolean);
  const urls = [
    "/api/data/me",
    "/api/data/semesters",
    "/api/data/classes",
    "/api/data/notifications",
    "/api/data/schedule-extras",
    ...studentIds.flatMap((studentId) => [...parentStudentDataUrls(studentId)]),
  ];
  const results = await Promise.allSettled(urls.map((url) => cachedJson(url)));
  return {
    ok: studentsOk && results.every((result) => result.status === "fulfilled"),
    studentIds,
  };
}

export function invalidateClientDataCache(url?: string) {
  clearLocalCache(url);
  broadcastInvalidation(url);
}

export type DashboardCacheOptions = {
  ttlMs?: number;
  force?: boolean;
};

export type DashboardLoadStatus = "loading" | "ready" | "error";

export type DashboardLoadable<T> = {
  status: DashboardLoadStatus;
  data: T | null;
  error: string | null;
  loadedAt: number | null;
};

export function dashboardLoadableFromCache<T>(data: T | null): DashboardLoadable<T> {
  return {
    status: data === null ? "loading" : "ready",
    data,
    error: null,
    loadedAt: data === null ? null : Date.now(),
  };
}

export function setClientDataCacheScope(scope: string) {
  const nextScope = scope.trim() || "default";
  if (nextScope === cacheScope) return;
  cacheScope = nextScope;
}

export function peekDashboardData<T>(key: string): T | null {
  return peekCachedJson<T>(key);
}

export async function readDashboardData<T>(
  key: string,
  loader?: () => Promise<T>,
  options: DashboardCacheOptions = {},
): Promise<T> {
  if (options.force) invalidateClientDataCache(key);
  if (!loader) return cachedJson<T>(key, options.ttlMs);

  const cached = peekCachedJson<T>(key);
  if (cached && !options.force && !isUnavailablePayload(cached)) return cached;
  if (cached && isUnavailablePayload(cached)) clearLocalCache(key);

  const existing = inFlight.get(scopedKey(key)) as Promise<T> | undefined;
  if (existing) return existing;

  const request = loader()
    .then((data) => writeCache(key, data, options.ttlMs ?? DEFAULT_TTL_MS))
    .finally(() => inFlight.delete(scopedKey(key)));
  inFlight.set(scopedKey(key), request as Promise<unknown>);
  return request;
}

export function preloadDashboardData<T>(
  key: string,
  loader?: () => Promise<T>,
  options: DashboardCacheOptions = {},
) {
  void readDashboardData<T>(key, loader, options).catch(() => {
    /* Preload should never break the page. */
  });
}

export function invalidateDashboardData(key?: string | string[]) {
  if (Array.isArray(key)) {
    for (const item of key) invalidateClientDataCache(item);
    return;
  }
  invalidateClientDataCache(key);
}

export function mutateDashboardData<T>(
  key: string,
  updater: (current: T | null) => T,
  ttlMs = DEFAULT_TTL_MS,
) {
  const next = updater(peekCachedJson<T>(key));
  writeCache(key, next, ttlMs);
  return next;
}
