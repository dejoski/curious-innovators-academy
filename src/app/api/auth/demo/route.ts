import { NextResponse } from "next/server";

import { DEMO_UI_ROLE_COOKIE_NAME, isDemoLoginEnabled } from "@/lib/demo-login";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DemoRole = "admin" | "parent";

type DemoCredentialSource = {
  emailEnv: string;
  passwordEnv: string;
};

const DEMO_CREDENTIALS: Record<DemoRole, DemoCredentialSource> = {
  admin: {
    emailEnv: "CIA_RLS_ADMIN_EMAIL",
    passwordEnv: "CIA_RLS_ADMIN_PASSWORD",
  },
  parent: {
    emailEnv: "CIA_RLS_PARENT_EMAIL",
    passwordEnv: "CIA_RLS_PARENT_PASSWORD",
  },
};

function credentialErrorMessage(role: DemoRole): string {
  return `Demo ${role} credentials are not configured. Set ${DEMO_CREDENTIALS[role].emailEnv}/${DEMO_CREDENTIALS[role].passwordEnv} in the deployment environment.`;
}

function readDemoCredential(role: DemoRole): { email: string; password: string } | null {
  const { emailEnv, passwordEnv } = DEMO_CREDENTIALS[role];
  const email = process.env[emailEnv]?.trim();
  const password = process.env[passwordEnv]?.trim();
  if (!email || !password) return null;
  return { email, password };
}

export async function POST(request: Request) {
  let rawRole: DemoRole | null = null;
  try {
    const body = (await request.json()) as { kind?: unknown };
    rawRole = body.kind === "admin" || body.kind === "parent" ? body.kind : null;
  } catch {
    rawRole = null;
  }
  if (rawRole !== "admin" && rawRole !== "parent") {
    return NextResponse.json({ error: "Invalid demo role." }, { status: 400 });
  }

  const hostname = new URL(request.url).hostname;
  if (!isDemoLoginEnabled(hostname)) {
    return NextResponse.json({ error: "Demo sign-in is disabled on this host." }, { status: 403 });
  }

  const credentials = readDemoCredential(rawRole);
  if (!credentials) {
    return NextResponse.json({ error: credentialErrorMessage(rawRole) }, { status: 503 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
  } catch {
    return NextResponse.json(
      { error: "Demo sign-in is unavailable. Ask an administrator to configure Supabase." },
      { status: 503 },
    );
  }

  const response = NextResponse.json({ ok: true, role: rawRole });
  response.cookies.set(DEMO_UI_ROLE_COOKIE_NAME, "", { maxAge: 0, path: "/" });

  return response;
}
