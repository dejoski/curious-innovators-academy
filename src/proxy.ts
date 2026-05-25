import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getRuntimeSupabaseAnonKey,
  getRuntimeSupabaseUrl,
  isRemoteDataRequired,
} from "@/lib/data/env";
import type { DashboardPersona } from "@/lib/demo-accounts";
import { dashboardRedirectForPersona } from "@/lib/dashboard/role-routes";
import { DEMO_UI_ROLE_COOKIE_NAME, isLocalDemoHost } from "@/lib/demo-login";

function isDashboardPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

function isProtectedApiPath(pathname: string): boolean {
  return (
    pathname === "/api/dashboard-presentation" ||
    pathname === "/api/data" ||
    pathname.startsWith("/api/data/") ||
    pathname.startsWith("/api/admin/")
  );
}

function isParentClassRequestSubmission(request: NextRequest): boolean {
  return request.method === "POST" && request.nextUrl.pathname === "/api/data/enrichment-requests";
}

function redirectToLogin(request: NextRequest, auth: "configuration" | "required") {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("auth", auth);
  if (auth === "required") {
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
  }
  return NextResponse.redirect(loginUrl);
}

function apiAuthError(status: 401 | 503, error: string) {
  return NextResponse.json({ error }, { status });
}

function authErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

function isMissingAuthSession(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AuthSessionMissingError"
  );
}

function roleFromProfile(raw: unknown): DashboardPersona | null {
  const role = String(raw ?? "").toLowerCase();
  if (role === "admin" || role === "parent" || role === "teacher" || role === "student") return role;
  return null;
}

function demoRoleFromCookie(request: NextRequest): DashboardPersona | null {
  return roleFromProfile(request.cookies.get(DEMO_UI_ROLE_COOKIE_NAME)?.value);
}

function localDemoRole(request: NextRequest): DashboardPersona | null {
  if (!isLocalDemoHost(request.nextUrl.hostname)) return null;
  return demoRoleFromCookie(request);
}

function dashboardRoleRedirect(
  request: NextRequest,
  role: DashboardPersona,
  studentId: string | null = null,
): NextResponse | null {
  const redirectPath = dashboardRedirectForPersona(
    request.nextUrl.pathname,
    role,
    studentId,
  );
  if (!redirectPath) return null;

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = redirectPath;
  redirectUrl.search = "";
  if (role === "parent") {
    const studentId = request.nextUrl.searchParams.get("student")?.trim();
    if (studentId) redirectUrl.searchParams.set("student", studentId);
  }
  return NextResponse.redirect(redirectUrl);
}

async function loadDashboardAccess(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<{ role: DashboardPersona; studentId: string | null } | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;

  const role = roleFromProfile(profile?.role);
  if (!role) return null;

  if (role !== "student") return { role, studentId: null };

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", userId)
    .limit(1)
    .maybeSingle();

  return { role, studentId: student?.id ? String(student.id) : null };
}

function isAuthServiceFailure(error: unknown): boolean {
  if (!error || isMissingAuthSession(error)) return false;
  const status = authErrorStatus(error);
  return status === undefined || status === 0 || status >= 500;
}

/**
 * Refreshes the auth session when Supabase is configured (Next.js 16 proxy convention),
 * protects dashboard/data routes when production remote-data mode is enabled, and
 * keeps demo/no-session traffic out of admin routes unless Admin was explicitly chosen.
 */
export async function proxy(request: NextRequest) {
  const url = getRuntimeSupabaseUrl();
  const anonKey = getRuntimeSupabaseAnonKey();
  const requireRemoteData = isRemoteDataRequired();
  const dashboardPath = isDashboardPath(request.nextUrl.pathname);
  const demoRole = localDemoRole(request);
  const protectDashboard = requireRemoteData && dashboardPath;
  const protectApi =
    requireRemoteData &&
    isProtectedApiPath(request.nextUrl.pathname) &&
    !isParentClassRequestSubmission(request);
  const localDemoRead =
    Boolean(demoRole) &&
    request.method === "GET" &&
    request.nextUrl.pathname.startsWith("/api/data/");

  if (!url || !anonKey) {
    if (protectApi && localDemoRead) return NextResponse.next();
    if (protectApi) return apiAuthError(503, "Supabase is not configured.");
    if (protectDashboard && demoRole) {
      const redirect = dashboardRoleRedirect(request, demoRole);
      if (redirect) return redirect;
      return NextResponse.next();
    }
    if (protectDashboard) return redirectToLogin(request, "configuration");
    if (dashboardPath) {
      const redirect = dashboardRoleRedirect(request, demoRole ?? "parent");
      if (redirect) return redirect;
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser().catch((err: unknown) => ({
    data: { user: null },
    error: err,
  }));

  if ((protectApi || protectDashboard) && isAuthServiceFailure(error)) {
    if (protectApi) return apiAuthError(503, "Supabase session check failed.");
    return redirectToLogin(request, "configuration");
  }

  if (protectApi && !user) {
    if (localDemoRead) return response;
    return apiAuthError(401, "Sign in required.");
  }

  if (protectDashboard && !user && demoRole) {
    const redirect = dashboardRoleRedirect(request, demoRole);
    if (redirect) return redirect;
    return response;
  }

  if (protectDashboard && !user) {
    return redirectToLogin(request, "required");
  }

  if (dashboardPath && user) {
    const access = await loadDashboardAccess(supabase, user.id);
    if (!access) {
      if (requireRemoteData) return redirectToLogin(request, "required");
      const redirect = dashboardRoleRedirect(request, "parent");
      if (redirect) return redirect;
      return response;
    }

    const redirect = dashboardRoleRedirect(request, access.role, access.studentId);
    if (redirect) return redirect;
  }

  if (dashboardPath && !user && !requireRemoteData) {
    const redirect = dashboardRoleRedirect(request, demoRole ?? "parent");
    if (redirect) return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
