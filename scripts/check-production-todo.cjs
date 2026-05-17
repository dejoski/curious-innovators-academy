#!/usr/bin/env node
/*
 * Keeps PRODUCTION_TODO.md honest: repo-owned production work should not be
 * left as an unchecked item. The only allowed unchecked items are the known
 * external managed Supabase restore blocker.
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const todoPath = path.join(root, "PRODUCTION_TODO.md");

const ALLOWED_UNCHECKED = [
  /Run a database backup\/restore drill in Supabase using `OPERATIONS\.md`/,
  /`npm run check:supabase-backups` against linked project `cadkwvfybunnxoppqlfc` currently fails because Supabase reports `pitr_enabled=false`, `completed backups=0`, `walg_enabled=true`/,
];

function main() {
  if (!fs.existsSync(todoPath)) {
    throw new Error("PRODUCTION_TODO.md is missing");
  }

  const unchecked = fs
    .readFileSync(todoPath, "utf8")
    .split("\n")
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => line.trim().startsWith("- [ ]"));

  const unexpected = unchecked.filter(
    ({ line }) => !ALLOWED_UNCHECKED.some((pattern) => pattern.test(line)),
  );

  if (unexpected.length) {
    console.error("check-production-todo: FAIL (unexpected unchecked production TODO item(s))");
    for (const item of unexpected) {
      console.error(`- PRODUCTION_TODO.md:${item.number}: ${item.line.trim()}`);
    }
    process.exit(1);
  }

  console.log(
    `check-production-todo: OK (${unchecked.length} allowed external blocker item(s), ${unexpected.length} unexpected)`,
  );
}

try {
  main();
} catch (err) {
  console.error(`check-production-todo: FAIL (${err instanceof Error ? err.message : String(err)})`);
  process.exit(1);
}
