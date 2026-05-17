#!/usr/bin/env node
/*
 * Production launch / restore-target verifier for Curious Innovators Academy.
 *
 * This is intentionally an operator script: run it only with target production
 * or restored Supabase env vars loaded. It does not print access tokens or service keys.
 */

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);
let createClient;

const REQUIRED_DEMO_USERS = [
  { email: "name.example@gmail.com", role: "admin" },
  { email: "parent.lee@cia.demo", role: "parent" },
  { email: "parent.collins@cia.demo", role: "parent" },
  { email: "teacher.emily@cia.demo", role: "teacher" },
  { email: "student.anna@cia.demo", role: "student" },
];

const DEFAULT_RLS_EMAILS = {
  CIA_RLS_ADMIN_EMAIL: "name.example@gmail.com",
  CIA_RLS_PARENT_EMAIL: "parent.lee@cia.demo",
  CIA_RLS_TEACHER_EMAIL: "teacher.emily@cia.demo",
  CIA_RLS_STUDENT_EMAIL: "student.anna@cia.demo",
};

const DEFAULT_PRODUCTION_APP_URL = "https://curious-innovators-academy.vercel.app";

const REQUIRED_TABLE_COUNTS = [
  ["profiles", 5],
  ["parents", 2],
  ["teachers", 1],
  ["students", 6],
  ["parent_students", 5],
  ["classes", 5],
  ["enrollments", 5],
  ["class_requests", 6],
  ["schedule_events", 1],
  ["student_records", 1],
  ["feedback", 1],
  ["notifications", 1],
  ["invoices", 3],
  ["user_preferences", 0],
  ["support_tickets", 0],
  ["audit_events", 0],
];

const REQUIRED_ENDPOINTS = [
  ["/api/health", "json-ok"],
  ["/api/version", "json"],
  ["/api/data/me", "json-401"],
  ["/api/data/students", "json-401"],
  ["/api/dashboard-presentation", "json-401"],
  ["/login", "html"],
  ["/reset-password", "html"],
  ["/privacy", "html"],
  ["/terms", "html"],
];

const root = path.join(__dirname, "..");
const results = [];

function loadDotenv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function env(name) {
  const v = process.env[name]?.trim();
  return v || "";
}

function normalizeBaseUrl(raw) {
  const v = raw.trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v.replace(/\/$/, "") : `https://${v.replace(/\/$/, "")}`;
}

function projectRefFromUrl(rawUrl) {
  if (!rawUrl) return "";
  try {
    const host = new URL(rawUrl).host;
    const [ref] = host.split(".");
    return ref || "";
  } catch {
    return "";
  }
}

function record(status, name, detail = "") {
  results.push({ status, name, detail });
  const label = status === "ok" ? "OK" : status === "warn" ? "WARN" : "FAIL";
  console.log(`${label}: ${name}${detail ? ` - ${detail}` : ""}`);
}

async function check(name, fn) {
  try {
    const detail = await fn();
    record("ok", name, detail);
  } catch (err) {
    record("fail", name, err instanceof Error ? err.message : String(err));
  }
}

function requireEnv(name) {
  const v = env(name);
  if (!v) throw new Error(`${name} is missing`);
  return v;
}

function smokeEmail(name) {
  return env(name) || DEFAULT_RLS_EMAILS[name] || requireEnv(name);
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

async function countRows(admin, table) {
  const { count, error } = await admin
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function signInAnon(url, anonKey, email, password) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return client;
}

async function main() {
  loadDotenv(path.join(root, ".env.production.local"));
  loadDotenv(path.join(root, ".env.local"));
  loadDotenv(path.join(root, ".env"));

  if (process.argv.includes("--help")) {
    console.log(`Usage:
  npm run verify:production
  npm run verify:restore-target

Required env:
  NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  CIA_RLS_ADMIN_PASSWORD
  CIA_RLS_PARENT_PASSWORD
  CIA_RLS_TEACHER_PASSWORD
  CIA_RLS_STUDENT_PASSWORD

Production launch env:
  NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false
  NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true
  NEXT_PUBLIC_SIGNUP_INVITE_CODE=<deployment-specific value>
  CIA_APP_URL=https://your-deployed-domain (defaults to ${DEFAULT_PRODUCTION_APP_URL})

Restore-target env:
  CIA_VERIFY_RESTORE_TARGET=true
  CIA_PRODUCTION_SUPABASE_PROJECT_REF=<production project ref>

Optional env:
  CIA_RLS_ADMIN_EMAIL / CIA_RLS_PARENT_EMAIL / CIA_RLS_TEACHER_EMAIL / CIA_RLS_STUDENT_EMAIL
    Defaults to the seeded smoke users from supabase/seed/track2_demo_seed.sql.
`);
    return;
  }

  ({ createClient } = require("@supabase/supabase-js"));

  const restoreTargetMode = env("CIA_VERIFY_RESTORE_TARGET") === "true";
  const supabaseUrl = restoreTargetMode
    ? env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL")
    : env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL");
  const anonKey = restoreTargetMode
    ? env("SUPABASE_ANON_KEY") || env("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    : env("NEXT_PUBLIC_SUPABASE_ANON_KEY") || env("SUPABASE_ANON_KEY");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const targetProjectRef = projectRefFromUrl(supabaseUrl);
  const appUrl = normalizeBaseUrl(
    env("CIA_APP_URL") ||
      env("NEXT_PUBLIC_APP_URL") ||
      env("VERCEL_PROJECT_PRODUCTION_URL") ||
      env("VERCEL_URL") ||
      DEFAULT_PRODUCTION_APP_URL,
  );

  await check("required Supabase env vars are present", () => {
    requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL is missing");
    if (!anonKey) {
      throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY is missing");
    }
    if (env("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")) {
      throw new Error("service role key must not be exposed as NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");
    }
    return new URL(supabaseUrl).host;
  });

  if (restoreTargetMode) {
    await check("restore target is not production Supabase project", () => {
      const productionRef = requireEnv("CIA_PRODUCTION_SUPABASE_PROJECT_REF");
      if (!targetProjectRef) throw new Error("could not derive target project ref from Supabase URL");
      if (targetProjectRef === productionRef) {
        throw new Error(
          "restore-target verification is pointing at the production Supabase project",
        );
      }
      return `${targetProjectRef} != ${productionRef}`;
    });
    if (results.some((r) => r.status === "fail")) {
      const failed = results.filter((r) => r.status === "fail");
      const warned = results.filter((r) => r.status === "warn");
      console.log("");
      console.log(
        `Restore target readiness: FAIL (${results.length - failed.length - warned.length} ok, ${warned.length} warn, ${failed.length} fail)`,
      );
      process.exit(1);
    }
  } else {
    await check("production env flags fail closed", () => {
      if (env("NEXT_PUBLIC_ENABLE_DEMO_LOGIN") !== "false") {
        throw new Error("NEXT_PUBLIC_ENABLE_DEMO_LOGIN must be exactly false");
      }
      if (env("NEXT_PUBLIC_REQUIRE_REMOTE_DATA") !== "true") {
        throw new Error("NEXT_PUBLIC_REQUIRE_REMOTE_DATA must be exactly true");
      }
      const invite = env("NEXT_PUBLIC_SIGNUP_INVITE_CODE");
      if (!invite || invite === "CIA-DEMO-2026") {
        throw new Error("NEXT_PUBLIC_SIGNUP_INVITE_CODE must be deployment-specific");
      }
      for (const name of [
        "NEXT_PUBLIC_ENABLE_TEST_PERSONA_UI",
        "NEXT_PUBLIC_ENABLE_MOCK_NOTIFICATION_HEADER",
        "NEXT_PUBLIC_ENABLE_FIGMA_CAPTURE",
      ]) {
        if (env(name) === "true") throw new Error(`${name} must not be true in production`);
      }
      return "demo fallback disabled; remote data required";
    });
  }

  await check("dependency audit has no moderate or higher vulnerabilities", async () => {
    try {
      const { stdout } = await execFileAsync(
        "npm",
        ["audit", "--audit-level=moderate", "--json"],
        { cwd: root, maxBuffer: 1024 * 1024 * 8 },
      );
      const report = JSON.parse(stdout);
      const total = report.metadata?.vulnerabilities?.total ?? 0;
      if (total > 0) throw new Error(`${total} vulnerabilities reported`);
      return "found 0 vulnerabilities";
    } catch (err) {
      const stdout = err && typeof err === "object" && "stdout" in err ? err.stdout : "";
      if (stdout) {
        const report = JSON.parse(String(stdout));
        const counts = report.metadata?.vulnerabilities ?? {};
        const total = counts.total ?? 0;
        throw new Error(`${total} vulnerabilities reported`);
      }
      throw err;
    }
  });

  if (!supabaseUrl || !anonKey || !serviceKey) {
    throw new Error("Cannot continue without Supabase env");
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await check("Supabase Auth demo/operator users exist", async () => {
    const users = await listAllAuthUsers(admin);
    const existing = new Set(users.map((u) => String(u.email ?? "").toLowerCase()));
    const missing = REQUIRED_DEMO_USERS.filter((u) => !existing.has(u.email));
    if (missing.length) {
      throw new Error(`missing auth users: ${missing.map((u) => u.email).join(", ")}`);
    }
    return `${REQUIRED_DEMO_USERS.length} required users found`;
  });

  await check("profile roles match seed contract", async () => {
    const { data, error } = await admin
      .from("profiles")
      .select("email, role")
      .in("email", REQUIRED_DEMO_USERS.map((u) => u.email));
    if (error) throw new Error(error.message);
    const byEmail = new Map((data ?? []).map((row) => [String(row.email).toLowerCase(), row]));
    const mismatches = [];
    for (const expected of REQUIRED_DEMO_USERS) {
      const row = byEmail.get(expected.email);
      if (!row) {
        mismatches.push(`${expected.email}: no profile`);
      } else if (row.role !== expected.role) {
        mismatches.push(`${expected.email}: expected ${expected.role}, got ${row.role}`);
      }
    }
    if (mismatches.length) throw new Error(mismatches.join("; "));
    return `${REQUIRED_DEMO_USERS.length} profile roles verified`;
  });

  await check("seeded database tables are populated", async () => {
    const short = [];
    for (const [table, min] of REQUIRED_TABLE_COUNTS) {
      const count = await countRows(admin, table);
      if (count < min) short.push(`${table}: ${count}/${min}`);
    }
    if (short.length) throw new Error(short.join("; "));
    return `${REQUIRED_TABLE_COUNTS.length} tables checked`;
  });

  await check("admin RLS smoke can read admin-scoped data", async () => {
    const email = smokeEmail("CIA_RLS_ADMIN_EMAIL");
    const password = requireEnv("CIA_RLS_ADMIN_PASSWORD");
    const client = await signInAnon(supabaseUrl, anonKey, email, password);
    try {
      const { data, error } = await client.from("profiles").select("id, role").limit(10);
      if (error) throw new Error(error.message);
      if (!data || data.length < REQUIRED_DEMO_USERS.length) {
        throw new Error(`admin read returned ${data?.length ?? 0} profiles`);
      }
      return `${data.length} profiles visible to admin`;
    } finally {
      await client.auth.signOut();
    }
  });

  await check("parent RLS smoke is scoped to linked students", async () => {
    const email = smokeEmail("CIA_RLS_PARENT_EMAIL");
    const password = requireEnv("CIA_RLS_PARENT_PASSWORD");
    const client = await signInAnon(supabaseUrl, anonKey, email, password);
    try {
      const { data, error } = await client
        .from("students")
        .select("display_name")
        .order("display_name", { ascending: true });
      if (error) throw new Error(error.message);
      const names = new Set((data ?? []).map((row) => row.display_name));
      if (email.toLowerCase() === "parent.lee@cia.demo") {
        for (const expected of ["Anna Lee", "George Lee", "Bruna Lee"]) {
          if (!names.has(expected)) throw new Error(`missing linked student ${expected}`);
        }
        if (names.has("Maria Collins") || names.has("Bruce Collins")) {
          throw new Error("parent.lee@cia.demo can see Collins students");
        }
      } else if ((data ?? []).length < 1) {
        throw new Error("parent credential could not read any linked students");
      }
      return `${data?.length ?? 0} student row(s) visible to parent`;
    } finally {
      await client.auth.signOut();
    }
  });

  await check("teacher RLS smoke is scoped to taught students", async () => {
    const email = smokeEmail("CIA_RLS_TEACHER_EMAIL");
    const password = requireEnv("CIA_RLS_TEACHER_PASSWORD");
    const client = await signInAnon(supabaseUrl, anonKey, email, password);
    try {
      const { data, error } = await client
        .from("students")
        .select("display_name")
        .order("display_name", { ascending: true });
      if (error) throw new Error(error.message);
      const names = new Set((data ?? []).map((row) => row.display_name));
      for (const expected of ["Anna Lee", "George Lee", "Bruna Lee", "James Smith"]) {
        if (!names.has(expected)) throw new Error(`missing taught student ${expected}`);
      }
      if (names.has("Bruce Collins") || names.has("Maria Collins")) {
        throw new Error("teacher.emily@cia.demo can see untaught Collins students");
      }
      return `${data?.length ?? 0} student row(s) visible to teacher`;
    } finally {
      await client.auth.signOut();
    }
  });

  await check("student RLS smoke is limited to own student row", async () => {
    const email = smokeEmail("CIA_RLS_STUDENT_EMAIL");
    const password = requireEnv("CIA_RLS_STUDENT_PASSWORD");
    const client = await signInAnon(supabaseUrl, anonKey, email, password);
    try {
      const { data, error } = await client.from("students").select("display_name");
      if (error) throw new Error(error.message);
      if (!data || data.length !== 1) {
        throw new Error(`student credential saw ${data?.length ?? 0} rows, expected 1`);
      }
      return data[0].display_name;
    } finally {
      await client.auth.signOut();
    }
  });

  if (restoreTargetMode) {
    await check("deployed app checks skipped for restore target", () => {
      return "database/Auth/RLS restore validation only";
    });
  } else {
    await check("deployed app URL is configured", () => {
      if (!appUrl) throw new Error("set CIA_APP_URL or NEXT_PUBLIC_APP_URL");
      return appUrl;
    });
  }

  if (!restoreTargetMode && appUrl) {
    for (const [endpoint, kind] of REQUIRED_ENDPOINTS) {
      await check(`deployed ${endpoint} responds`, async () => {
        const res = await fetch(`${appUrl}${endpoint}`, { redirect: "follow" });
        if (kind === "json-401") {
          if (res.status !== 401) throw new Error(`expected HTTP 401, got HTTP ${res.status}`);
          const body = await res.json();
          if (!body || typeof body.error !== "string") throw new Error("missing JSON error");
          return "unauthenticated request rejected";
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (kind === "json-ok") {
          const body = await res.json();
          if (body.ok !== true) throw new Error("missing ok:true");
        } else if (kind === "json") {
          await res.json();
        } else {
          const text = await res.text();
          if (!text.includes("<html") && !text.includes("<!DOCTYPE")) {
            throw new Error("response does not look like HTML");
          }
        }
        return `HTTP ${res.status}`;
      });
    }
  }

  const failed = results.filter((r) => r.status === "fail");
  const warned = results.filter((r) => r.status === "warn");
  console.log("");
  console.log(
    `${restoreTargetMode ? "Restore target" : "Production"} readiness: ${failed.length ? "FAIL" : "OK"} (${results.length - failed.length - warned.length} ok, ${warned.length} warn, ${failed.length} fail)`,
  );
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
