#!/usr/bin/env node
/*
 * Static guard for Supabase SQL that would expose application data to anon.
 * Production data must be scoped by authenticated RLS policies.
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const supabaseDir = path.join(root, "supabase");
const violations = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith(".sql")) files.push(full);
  }
  return files;
}

const patterns = [
  {
    label: "public anon SELECT policy",
    re: /\bFOR\s+SELECT\s+TO\s+anon\b[\s\S]*?\bUSING\s*\(\s*true\s*\)/i,
  },
  {
    label: "anon SELECT grant",
    re: /\bGRANT\s+SELECT\b[\s\S]*?\bTO\s+anon\b/i,
  },
  {
    label: "demo public read policy",
    re: /\bdemo_public_read_/i,
  },
];

for (const file of walk(supabaseDir)) {
  const rel = path.relative(root, file);
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const window = lines.slice(i, i + 8).join("\n");
    for (const pattern of patterns) {
      if (pattern.re.test(window)) {
        violations.push(`${rel}:${i + 1} ${pattern.label}`);
      }
    }
  }
}

if (violations.length) {
  console.error("FAIL: insecure Supabase SQL detected:");
  for (const v of violations) console.error(`- ${v}`);
  process.exit(1);
}

console.log("check-sql-security: OK (no anon public-read SQL detected)");
