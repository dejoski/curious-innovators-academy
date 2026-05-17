import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getRuntimeSupabaseAnonKey,
  getRuntimeSupabaseUrl,
  isRemoteDataRequired,
} from "@/lib/data/env";

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

function isAuthServiceFailure(error: unknown): boolean {
  if (!error || isMissingAuthSession(error)) return false;
  const status = authErrorStatus(error);
  return status === undefined || status === 0 || status >= 500;
}

/**
 * Refreshes the auth session when Supabase is configured (Next.js 16 proxy convention)
 * and protects dashboard/data routes when production remote-data mode is enabled.
 */
export async function proxy(request: NextRequest) {
  const url = getRuntimeSupabaseUrl();
  const anonKey = getRuntimeSupabaseAnonKey();
  const requireRemoteData = isRemoteDataRequired();
  const protectDashboard = requireRemoteData && isDashboardPath(request.nextUrl.pathname);
  const protectApi = requireRemoteData && isProtectedApiPath(request.nextUrl.pathname);

  if (!url || !anonKey) {
    if (protectApi) return apiAuthError(503, "Supabase is not configured.");
    if (protectDashboard) return redirectToLogin(request, "configuration");
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
    return apiAuthError(401, "Sign in required.");
  }

  if (protectDashboard && !user) {
    return redirectToLogin(request, "required");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
