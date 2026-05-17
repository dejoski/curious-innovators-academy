#!/usr/bin/env node
/*
 * Keeps the operator env contract discoverable and safe. Real env files stay
 * ignored, but .env.example must be committable and document every launch,
 * verifier, backup, restore, and provisioning variable.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const envExample = path.join(root, ".env.example");

const REQUIRED_ENV_NAMES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_ENABLE_DEMO_LOGIN",
  "NEXT_PUBLIC_REQUIRE_REMOTE_DATA",
  "NEXT_PUBLIC_ENABLE_TEST_PERSONA_UI",
  "NEXT_PUBLIC_ENABLE_NOTIFICATION_HEADER",
  "NEXT_PUBLIC_ENABLE_MOCK_NOTIFICATION_HEADER",
  "NEXT_PUBLIC_ENABLE_FIGMA_CAPTURE",
  "NEXT_PUBLIC_SIGNUP_INVITE_CODE",
  "CIA_APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "CIA_RLS_ADMIN_EMAIL",
  "CIA_RLS_ADMIN_PASSWORD",
  "CIA_RLS_PARENT_EMAIL",
  "CIA_RLS_PARENT_PASSWORD",
  "CIA_RLS_TEACHER_EMAIL",
  "CIA_RLS_TEACHER_PASSWORD",
  "CIA_RLS_STUDENT_EMAIL",
  "CIA_RLS_STUDENT_PASSWORD",
  "CIA_VERIFY_RESTORE_TARGET",
  "CIA_PRODUCTION_SUPABASE_PROJECT_REF",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_PROJECT_REF",
  "CIA_KEEP_BACKUP_ARTIFACT",
  "CIA_AUTH_GUARD_INVALID_SUPABASE",
  "CIA_AUTH_GUARD_FAKE_SUPABASE",
  "CIA_AUTH_GUARD_PORT",
  "CIA_ADMIN_PASSWORD",
  "CIA_PARENT_LEE_PASSWORD",
  "CIA_PARENT_COLLINS_PASSWORD",
  "CIA_TEACHER_EMILY_PASSWORD",
  "CIA_STUDENT_ANNA_PASSWORD",
  "CIA_DEMO_USER_PASSWORD",
];

function git(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function isIgnored(relPath) {
  try {
    git(["check-ignore", relPath]);
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (!fs.existsSync(envExample)) {
    throw new Error(".env.example is missing");
  }

  if (isIgnored(".env.example")) {
    throw new Error(".env.example is ignored by git; add !.env.example after the .env* rule");
  }

  const trackedEnvFiles = git(["ls-files"])
    .split("\n")
    .filter(Boolean)
    .filter((file) => /(^|\/)\.env($|[._-])/.test(file) && file !== ".env.example");
  if (trackedEnvFiles.length) {
    throw new Error(`tracked env files are not allowed: ${trackedEnvFiles.join(", ")}`);
  }

  const content = fs.readFileSync(envExample, "utf8");
  const missing = REQUIRED_ENV_NAMES.filter((name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return !new RegExp(`(^|\\n)\\s*#?\\s*${escaped}=`, "m").test(content);
  });
  if (missing.length) {
    throw new Error(`.env.example is missing env placeholder(s): ${missing.join(", ")}`);
  }

  if (/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY\s*=/.test(content)) {
    throw new Error(".env.example must not include NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");
  }

  console.log(
    `check-env-contract: OK (${REQUIRED_ENV_NAMES.length} env placeholder(s), .env.example is committable)`,
  );
}

try {
  main();
} catch (err) {
  console.error(`check-env-contract: FAIL (${err instanceof Error ? err.message : String(err)})`);
  process.exit(1);
}
