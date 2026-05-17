#!/usr/bin/env node
/*
 * Static guard for protected API route handlers.
 *
 * Proxy protects production routes at runtime, but route handlers should still
 * fail closed themselves so platform/proxy behavior cannot expose data or writes.
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const apiDir = path.join(root, "src", "app", "api");
const violations = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name === "route.ts") out.push(full);
  }
  return out;
}

function isProtectedRoute(rel) {
  return (
    rel.startsWith(path.join("src", "app", "api", "data") + path.sep) ||
    rel.startsWith(path.join("src", "app", "api", "admin") + path.sep) ||
    rel === path.join("src", "app", "api", "dashboard-presentation", "route.ts")
  );
}

function matchingBraceIndex(source, openIndex) {
  let depth = 0;
  let inString = null;
  let escape = false;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

for (const file of walk(apiDir)) {
  const rel = path.relative(root, file);
  if (!isProtectedRoute(rel)) continue;

  const source = fs.readFileSync(file, "utf8");
  const hasGuardImport = source.includes("@/lib/api/require-auth") &&
    source.includes("requireRemoteApiSession");
  if (!hasGuardImport) {
    violations.push(`${rel}: missing requireRemoteApiSession import`);
    continue;
  }

  const exportedMethod = /export\s+async\s+function\s+(GET|POST|PATCH|DELETE)\s*\(/g;
  let match;
  let methodCount = 0;
  while ((match = exportedMethod.exec(source))) {
    methodCount += 1;
    const method = match[1];
    const open = source.indexOf("{", match.index);
    const close = open >= 0 ? matchingBraceIndex(source, open) : -1;
    if (open < 0 || close < 0) {
      violations.push(`${rel}: could not parse ${method} route body`);
      continue;
    }
    const body = source.slice(open, close);
    if (!body.includes("requireRemoteApiSession()")) {
      violations.push(`${rel}: ${method} lacks route-level requireRemoteApiSession guard`);
    }
  }

  if (methodCount === 0) {
    violations.push(`${rel}: no exported HTTP method found`);
  }
}

if (violations.length) {
  console.error("FAIL: protected API route guard violations:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("check-api-auth-guards: OK (protected API methods include route-level auth guards)");
