import { NextRequest, NextResponse } from "next/server";

import { dashboardHomeForPersona } from "@/lib/dashboard/role-routes";
import { isRemoteDataRequired } from "@/lib/data/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DashboardPersona } from "@/lib/dashboard/persona";

type DemoPersona = "admin" | "parent";

const DEMO_LOGIN_ERROR = "Demo login is not configured.";

function demoCredential(envVar: string, legacyPublicVar: string): string {
  return process.env[envVar]?.trim() || process.env[legacyPublicVar]?.trim() || "";
}

function demoCredentialsFor(kind: DemoPersona) {
  if (kind === "admin") {
    return {
      email: demoCredential("DEMO_ADMIN_EMAIL", "NEXT_PUBLIC_DEMO_ADMIN_EMAIL"),
      password: demoCredential("DEMO_ADMIN_PASSWORD", "NEXT_PUBLIC_DEMO_ADMIN_PASSWORD"),
    };
  }

  return {
    email: demoCredential("DEMO_PARENT_EMAIL", "NEXT_PUBLIC_DEMO_PARENT_EMAIL"),
    password: demoCredential("DEMO_PARENT_PASSWORD", "NEXT_PUBLIC_DEMO_PARENT_PASSWORD"),
  };
}

function redirectWithMessage(request: NextRequest, message: string) {
  const url = new URL(request.url);
  const loginUrl = new URL("/login", url);
  loginUrl.searchParams.set("auth", "error");
  loginUrl.searchParams.set("message", message);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest) {
  const kind = (new URL(request.url).searchParams.get("kind") as DemoPersona | null) ?? null;
  if (kind !== "admin" && kind !== "parent") {
    return redirectWithMessage(request, "Invalid demo login request.");
  }

  if (!isRemoteDataRequired()) {
    return redirectWithMessage(request, "Demo login is unavailable in this environment.");
  }

  const { email, password } = demoCredentialsFor(kind);
  if (!email || !password) {
    return redirectWithMessage(request, DEMO_LOGIN_ERROR);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user) {
      return redirectWithMessage(request, "Demo login failed. Contact support and try again.");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, default_student_id")
      .eq("id", data.user.id)
      .maybeSingle();

    const role = profile?.role;
    const persona = role === "admin" || role === "parent" || role === "teacher" || role === "student"
      ? (role as DashboardPersona)
      : "admin";
    const defaultStudentId =
      typeof profile?.default_student_id === "string" && profile.default_student_id.trim().length > 0
        ? profile.default_student_id
        : null;
    const home = dashboardHomeForPersona(persona, defaultStudentId);
    const next = new URL(home, request.url);
    return NextResponse.redirect(next);
  } catch {
    return redirectWithMessage(request, "Demo login failed. Contact support and try again.");
  }
}
