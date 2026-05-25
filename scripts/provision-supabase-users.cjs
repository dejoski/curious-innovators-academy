#!/usr/bin/env node
/*
 * Creates or repairs Supabase Auth users required by operator smoke checks.
 *
 * Run only with server-side production env loaded. This script never prints
 * passwords, access tokens, refresh tokens, or the service-role key.
 */

const path = require("path");
const { env, loadDotenvFiles } = require("./lib/env.cjs");

const USER_SPECS = [
  {
    emailEnv: "CIA_RLS_ADMIN_EMAIL",
    role: "admin",
    displayNameEnv: "CIA_RLS_ADMIN_DISPLAY_NAME",
    defaultDisplayName: "Admin user",
    passwordEnvs: ["CIA_RLS_ADMIN_PASSWORD", "CIA_ADMIN_PASSWORD"],
  },
  {
    emailEnv: "CIA_RLS_PARENT_EMAIL",
    role: "parent",
    displayNameEnv: "CIA_RLS_PARENT_DISPLAY_NAME",
    defaultDisplayName: "Parent user",
    passwordEnvs: ["CIA_RLS_PARENT_PASSWORD"],
  },
  {
    emailEnv: "CIA_RLS_TEACHER_EMAIL",
    role: "teacher",
    displayNameEnv: "CIA_RLS_TEACHER_DISPLAY_NAME",
    defaultDisplayName: "Teacher user",
    passwordEnvs: ["CIA_RLS_TEACHER_PASSWORD"],
  },
  {
    emailEnv: "CIA_RLS_STUDENT_EMAIL",
    role: "student",
    displayNameEnv: "CIA_RLS_STUDENT_DISPLAY_NAME",
    defaultDisplayName: "Student user",
    passwordEnvs: ["CIA_RLS_STUDENT_PASSWORD"],
  },
];

const root = path.join(__dirname, "..");
const args = new Set(process.argv.slice(2));

function usage() {
  console.log(`Usage:
  npm run provision:supabase-users [-- --require-passwords] [-- --reset-passwords]

Required env:
  NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Password env:
  CIA_RLS_ADMIN_EMAIL
  CIA_RLS_ADMIN_PASSWORD
  CIA_RLS_PARENT_EMAIL
  CIA_RLS_PARENT_PASSWORD
  CIA_RLS_TEACHER_EMAIL
  CIA_RLS_TEACHER_PASSWORD
  CIA_RLS_STUDENT_EMAIL
  CIA_RLS_STUDENT_PASSWORD

Optional display-name env:
  CIA_RLS_ADMIN_DISPLAY_NAME
  CIA_RLS_PARENT_DISPLAY_NAME
  CIA_RLS_TEACHER_DISPLAY_NAME
  CIA_RLS_STUDENT_DISPLAY_NAME

Behavior:
  - Missing users are created with a password when one is available.
  - Missing users are invited by email when no password is available.
  - --require-passwords requires the admin/parent/teacher/student RLS verifier passwords.
  - Existing users keep their password unless --reset-passwords is supplied.
  - Profiles are upserted with the configured role/display name.
`);
}

function requiredUsersFromEnv() {
  return USER_SPECS.map((spec) => {
    const email = env(spec.emailEnv).toLowerCase();
    if (!email) throw new Error(`${spec.emailEnv} is missing`);
    return {
      email,
      role: spec.role,
      displayName: env(spec.displayNameEnv) || spec.defaultDisplayName,
      passwordEnvs: spec.passwordEnvs,
    };
  });
}

function passwordFor(user) {
  for (const name of user.passwordEnvs) {
    const v = env(name);
    if (v) return v;
  }
  return "";
}

function assertPassword(password, email) {
  if (!password) return;
  if (password.length < 8) {
    throw new Error(`${email}: Supabase launch passwords must be at least 8 characters`);
  }
}

async function listAllAuthUsers(admin) {
  const users = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    users.push(...(data.users ?? []));
    if (!data.users || data.users.length < 1000) break;
    page += 1;
  }
  return users;
}

async function main() {
  loadDotenvFiles(root, [".env.production.local", ".env.local", ".env"]);

  if (args.has("--help") || args.has("-h")) {
    usage();
    return;
  }

  const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const requirePasswords = args.has("--require-passwords");
  const resetPasswords = args.has("--reset-passwords");

  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL is missing");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
  if (env("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")) {
    throw new Error("service role key must not be exposed as NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");
  }

  const { createClient } = require("@supabase/supabase-js");
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const existingUsers = await listAllAuthUsers(admin);
  const byEmail = new Map(
    existingUsers.map((u) => [String(u.email ?? "").toLowerCase(), u]),
  );

  const summary = { created: 0, invited: 0, updatedProfiles: 0, resetPasswords: 0 };

  for (const user of requiredUsersFromEnv()) {
    const email = user.email.toLowerCase();
    const password = passwordFor(user);
    const isVerifierUser = user.passwordEnvs.some((name) => name.startsWith("CIA_RLS_"));
    assertPassword(password, email);
    if (requirePasswords && isVerifierUser && !password) {
      throw new Error(`${email}: password env missing and --require-passwords was supplied`);
    }

    let authUser = byEmail.get(email);
    if (!authUser) {
      const metadata = { full_name: user.displayName };
      const result = password
        ? await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: metadata,
          })
        : await admin.auth.admin.inviteUserByEmail(email, { data: metadata });
      if (result.error || !result.data.user) {
        throw new Error(`${email}: ${result.error?.message ?? "Supabase did not return a user"}`);
      }
      authUser = result.data.user;
      byEmail.set(email, authUser);
      if (password) summary.created += 1;
      else summary.invited += 1;
    } else if (password && resetPasswords) {
      const { data, error } = await admin.auth.admin.updateUserById(authUser.id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: user.displayName },
      });
      if (error || !data.user) {
        throw new Error(`${email}: ${error?.message ?? "Supabase did not return updated user"}`);
      }
      authUser = data.user;
      summary.resetPasswords += 1;
    }

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: authUser.id,
        email,
        role: user.role,
        display_name: user.displayName,
      },
      { onConflict: "id" },
    );
    if (profileError) {
      throw new Error(
        `${email}: profile upsert failed. Run Supabase migrations before this script. ${profileError.message}`,
      );
    }
    summary.updatedProfiles += 1;
    console.log(`OK: ${email} -> ${user.role} profile ready`);
  }

  console.log("");
  console.log(
    `Supabase user provisioning OK (${summary.created} created, ${summary.invited} invited, ${summary.resetPasswords} password reset(s), ${summary.updatedProfiles} profiles upserted).`,
  );
  console.log("Next: run npm run verify:production with the same configured smoke users.");
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
