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

const apiDataFiles = walk("src/app/api/data").filter((file) => /\.(ts|tsx)$/.test(file));
for (const file of apiDataFiles) {
  const rel = relPath(file);
  const source = fs.readFileSync(file, "utf8");
  const forbidden = [
    /fetchAdmin[A-Za-z0-9_]*Resolved/,
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

const adminPages = {
  "src/app/dashboard/students/page.tsx": "fetchAdminStudentsResolved",
  "src/app/dashboard/students/[id]/page.tsx": "fetchAdminStudentProfileResolved",
  "src/app/dashboard/students/[id]/edit/page.tsx": "fetchAdminStudentByIdResolved",
  "src/app/dashboard/teachers/page.tsx": "fetchAdminTeachersResolved",
  "src/app/dashboard/parents/page.tsx": "fetchAdminParentsResolved",
  "src/app/dashboard/classes/page.tsx": "fetchAdminClassesResolved",
  "src/app/dashboard/classes/core/page.tsx": "fetchAdminClassesResolved",
  "src/app/dashboard/classes/enrichment/page.tsx": "fetchAdminClassesResolved",
  "src/app/dashboard/classes/requests/page.tsx": "fetchAdminEnrichmentRequestsResolved",
  "src/app/dashboard/schedule/page.tsx": "fetchAdminScheduleExtrasResolved",
  "src/components/dashboard-home.tsx": "fetchAdminEnrichmentRequestsResolved",
};

for (const [rel, expected] of Object.entries(adminPages)) {
  const source = read(rel);
  if (!source.includes(expected)) {
    fail(rel, `admin page must use explicit ${expected}`);
  }
}

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
