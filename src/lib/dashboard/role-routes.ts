import type { DashboardPersona } from "@/lib/dashboard/persona";

export const ADMIN_HOME_HREF = "/dashboard";
export const PARENT_HOME_HREF = "/dashboard/parents/home";
export const TEACHER_HOME_HREF = "/dashboard/teachers";

const LOCAL_URL_BASE = "https://cia.local";

export function isRouteBranch(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function normalizedDashboardHref(rawHref: string | null | undefined): {
  href: string;
  pathname: string;
  search: string;
} | null {
  const trimmed = rawHref?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed, LOCAL_URL_BASE);
    if (url.origin !== LOCAL_URL_BASE) return null;
    return {
      href: `${url.pathname}${url.search}${url.hash}`,
      pathname: url.pathname,
      search: url.search,
    };
  } catch {
    return null;
  }
}

function studentRootHref(studentId: string | null | undefined): string {
  const id = studentId?.trim();
  return id ? `/dashboard/students/${encodeURIComponent(id)}` : "/dashboard/students";
}

function studentHomeHref(studentId: string | null | undefined): string {
  const id = studentId?.trim();
  return id ? `${studentRootHref(id)}/schedule` : "/dashboard/students";
}

export function dashboardHomeForPersona(
  persona: DashboardPersona,
  studentId?: string | null,
): string {
  if (persona === "parent") return PARENT_HOME_HREF;
  if (persona === "teacher") return TEACHER_HOME_HREF;
  if (persona === "student") return studentHomeHref(studentId);
  return ADMIN_HOME_HREF;
}

export function isDashboardPathAllowedForPersona(
  pathname: string,
  persona: DashboardPersona,
  studentId?: string | null,
): boolean {
  if (!isRouteBranch(pathname, "/dashboard")) return true;
  if (persona === "admin") return true;

  if (
    isRouteBranch(pathname, "/dashboard/settings") ||
    isRouteBranch(pathname, "/dashboard/support") ||
    isRouteBranch(pathname, "/dashboard/notifications")
  ) {
    return true;
  }

  if (persona === "parent") {
    return isRouteBranch(pathname, "/dashboard/parents");
  }

  if (persona === "student") {
    return isRouteBranch(pathname, studentRootHref(studentId));
  }

  if (persona === "teacher") {
    return (
      isRouteBranch(pathname, "/dashboard/teachers") ||
      isRouteBranch(pathname, "/dashboard/schedule")
    );
  }

  return false;
}

export function dashboardRedirectForPersona(
  pathname: string,
  persona: DashboardPersona,
  studentId?: string | null,
): string | null {
  if (isDashboardPathAllowedForPersona(pathname, persona, studentId)) return null;
  return dashboardHomeForPersona(persona, studentId);
}

export function parentSafeDashboardHref(
  rawHref: string | null | undefined,
  fallback = PARENT_HOME_HREF,
): string {
  const parsed = normalizedDashboardHref(rawHref);
  if (!parsed) return fallback;

  const { href, pathname } = parsed;
  if (
    isRouteBranch(pathname, "/dashboard/parents") ||
    isRouteBranch(pathname, "/dashboard/settings") ||
    isRouteBranch(pathname, "/dashboard/support") ||
    isRouteBranch(pathname, "/dashboard/notifications")
  ) {
    return href;
  }

  if (isRouteBranch(pathname, "/dashboard/classes")) return "/dashboard/parents/catalog";
  if (isRouteBranch(pathname, "/dashboard/schedule")) return "/dashboard/parents/schedule";
  if (isRouteBranch(pathname, "/dashboard/students")) return "/dashboard/parents/students";
  if (pathname === "/dashboard") return PARENT_HOME_HREF;

  return fallback;
}

export function dashboardHrefForPersona(
  rawHref: string | null | undefined,
  persona: DashboardPersona,
  studentId?: string | null,
): string {
  const parsed = normalizedDashboardHref(rawHref);
  const fallback = dashboardHomeForPersona(persona, studentId);
  if (!parsed) return fallback;
  if (persona === "parent") return parentSafeDashboardHref(parsed.href, fallback);
  if (isDashboardPathAllowedForPersona(parsed.pathname, persona, studentId)) return parsed.href;
  return fallback;
}
