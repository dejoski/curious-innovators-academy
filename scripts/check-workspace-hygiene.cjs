#!/usr/bin/env node
/*
 * Fails when OS/editor scratch files drift into the repo tree. These files are
 * usually ignored by git, so ordinary status checks can miss them while local
 * script discovery and release packaging still see them.
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".vercel",
  "blob-report",
  "build",
  "coverage",
  "node_modules",
  "out",
  "playwright-report",
  "test-results",
]);

const SKIP_PREFIXES = [
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}.git${path.sep}`,
  `${path.sep}.next${path.sep}`,
  `${path.sep}supabase${path.sep}.temp${path.sep}`,
];

function isSkippedDir(absPath, name) {
  if (SKIP_DIRS.has(name)) return true;
  const normalized = absPath.split(path.sep).join(path.sep);
  return SKIP_PREFIXES.some((prefix) => `${path.sep}${path.relative(root, normalized)}${path.sep}`.includes(prefix));
}

function isScratchFile(name) {
  return (
    name === ".DS_Store" ||
    name === "Thumbs.db" ||
    name.startsWith(".!") ||
    name.endsWith("~") ||
    name.endsWith(".tmp") ||
    name.endsWith(".bak")
  );
}

function walk(absDir, violations) {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const absPath = path.join(absDir, entry.name);
    const relPath = path.relative(root, absPath);

    if (entry.isDirectory()) {
      if (isSkippedDir(absPath, entry.name)) continue;
      if (entry.name === "tmp") {
        violations.push(`${relPath}/`);
        continue;
      }
      walk(absPath, violations);
      continue;
    }

    if (entry.isFile() && isScratchFile(entry.name)) {
      violations.push(relPath);
    }
  }
}

function main() {
  const violations = [];
  walk(root, violations);

  if (violations.length) {
    console.error("check-workspace-hygiene: FAIL (scratch file(s) found)");
    for (const violation of violations.sort()) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log("check-workspace-hygiene: OK (no OS/editor scratch files found)");
}

try {
  main();
} catch (err) {
  console.error(`check-workspace-hygiene: FAIL (${err instanceof Error ? err.message : String(err)})`);
  process.exit(1);
}
