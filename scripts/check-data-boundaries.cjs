#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const failures = [];

function relPath(absPath) {
  return path.relative(root, absPath).replaceAll(path.sep, "/");
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function walk(relDir) {
  const absDir = path.join(root, relDir);
  if (!fs.existsSync(absDir)) return [];
  return fs.readdirSync(absDir, { withFileTypes: true }).flatMap((entry) => {
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) return walk(relPath(abs));
    return [abs];
  });
}

function fail(rel, message) {
  failures.push(`${rel}: ${message}`);
}

function assertIncludes(rel, needles) {
  const source = read(rel);
  for (const needle of needles) {
    if (!source.includes(needle)) {
      fail(rel, `missing ${JSON.stringify(needle)}`);
    }
  }
}

const apiDataFiles = walk("src/app/api/data").filter((file) => /\.(ts|tsx)$/.test(file));
for (const file of apiDataFiles) {
  const rel = relPath(file);
  const source = fs.readFileSync(file, "utf8");
  if (rel === "src/app/api/data/students/[id]/avatar/route.ts") {
    continue;
  }
  const forbidden = [
    /requireAdminReadClient/,
    /@\/lib\/api\/admin-read/,
    /@\/lib\/supabase\/admin/,
    /@\/lib\/data\/server-env/,
    /createSupabaseAdminClient/,
    /isSupabaseAdminConfigured/,
    /SUPABASE_SERVICE_ROLE_KEY/,
  ];
  for (const pattern of forbidden) {
    if (pattern.test(source)) {
      fail(rel, `API data routes must stay session/RLS scoped; matched ${pattern}`);
    }
  }
}

const repositoryFiles = walk("src/lib/data/repositories").filter((file) => /\.(ts|tsx)$/.test(file));
for (const file of repositoryFiles) {
  const rel = relPath(file);
  const source = fs.readFileSync(file, "utf8");
  const forbiddenDirectAdmin = [
    /@\/lib\/supabase\/admin/,
    /@\/lib\/data\/server-env/,
    /createSupabaseAdminClient\s*\(/,
    /isSupabaseAdminConfigured\s*\(/,
  ];
  for (const pattern of forbiddenDirectAdmin) {
    if (pattern.test(source)) {
      fail(rel, `repositories must not directly switch to service-role reads; use requireAdminReadClient`);
    }
  }
}

assertIncludes("src/app/dashboard/admin-panels.tsx", ["DashboardHomeClient", "AdminStudentsPanel", "AdminStudentSchedulePanel"]);
assertIncludes("src/components/dashboard-home-client.tsx", ["useDashboardData", "/api/data/enrichment-requests"]);

const adminRead = read("src/lib/api/admin-read.ts");
for (const expected of [
  "sessionClient.auth.getUser()",
  '.from("profiles")',
  "isAdminRole(profile?.role)",
  "createSupabaseAdminClient()",
]) {
  if (!adminRead.includes(expected)) {
    fail("src/lib/api/admin-read.ts", `missing verified admin-read step: ${expected}`);
  }
}

if (failures.length > 0) {
  console.error("Data boundary check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Data boundary check passed.");
