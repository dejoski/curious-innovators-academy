#!/usr/bin/env node
/*
 * Static guard for server-only Supabase secrets.
 *
 * The service-role key must stay behind server-only modules and API route
 * handlers. Browser/client components and shared helpers may mention the env
 * variable name in UI copy, but must not import admin clients or read the key.
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const srcRoot = path.join(root, "src");
const violations = [];

const requiredServerOnlyFiles = [
  path.join("src", "lib", "data", "server-env.ts"),
  path.join("src", "lib", "data", "server-writes.ts"),
  path.join("src", "lib", "data", "repositories", "classes.ts"),
  path.join("src", "lib", "data", "repositories", "notifications.ts"),
  path.join("src", "lib", "supabase", "admin.ts"),
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function isApiRoute(rel) {
  return rel.startsWith(path.join("src", "app", "api") + path.sep) &&
    rel.endsWith(path.join(path.sep, "route.ts"));
}

function hasUseClientDirective(source) {
  return /^["']use client["'];?/.test(source.trimStart());
}

for (const rel of requiredServerOnlyFiles) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    violations.push(`${rel}: required server-only module is missing`);
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes('import "server-only"') && !source.includes("import 'server-only'")) {
    violations.push(`${rel}: missing import "server-only"`);
  }
}

for (const file of walk(srcRoot)) {
  const rel = path.relative(root, file);
  const source = fs.readFileSync(file, "utf8");
  const isClient = hasUseClientDirective(source);
  const isServerOnlyModule = source.includes('import "server-only"') || source.includes("import 'server-only'");
  const isAdminModule = rel === path.join("src", "lib", "supabase", "admin.ts");
  const isServerEnvModule = rel === path.join("src", "lib", "data", "server-env.ts");

  const importsAdminClient = /from\s+["']@\/lib\/supabase\/admin["']/.test(source) ||
    /from\s+["'][^"']*\/supabase\/admin["']/.test(source);
  const importsServerEnv = /from\s+["']@\/lib\/data\/server-env["']/.test(source) ||
    /from\s+["'][^"']*\/data\/server-env["']/.test(source);
  const callsAdminClient = source.includes("createSupabaseAdminClient(");

  if (isClient && (importsAdminClient || importsServerEnv || callsAdminClient)) {
    violations.push(`${rel}: client component touches server-only Supabase admin helpers`);
  }

  if ((importsAdminClient || callsAdminClient) && !isAdminModule && !isApiRoute(rel) && !isServerOnlyModule) {
    violations.push(`${rel}: Supabase admin client is only allowed in API route handlers or server-only modules`);
  }

  if (importsServerEnv && !isServerEnvModule && !isApiRoute(rel) && !isAdminModule && !isServerOnlyModule) {
    violations.push(`${rel}: server env helpers are only allowed in API route handlers or server-only modules`);
  }

  const readsServiceRole =
    /process\.env\.SUPABASE_SERVICE_ROLE_KEY/.test(source) ||
    /readRuntimeEnv\(\s*["']SUPABASE_SERVICE_ROLE_KEY["']\s*\)/.test(source);
  if (readsServiceRole && !isServerEnvModule) {
    violations.push(`${rel}: direct service-role env reads must stay in src/lib/data/server-env.ts`);
  }

  if (source.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")) {
    violations.push(`${rel}: service-role key must never use a NEXT_PUBLIC_* env name`);
  }
}

if (violations.length) {
  console.error("FAIL: server secret boundary violations:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("check-server-secret-boundaries: OK (service-role helpers stay server-only)");
