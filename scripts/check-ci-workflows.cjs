#!/usr/bin/env node
/*
 * The deployment contract for this repo is Vercel-only: push to main and let
 * Vercel build/deploy. GitHub Actions workflow files must not be present,
 * because inert or partially disabled workflows create noisy failed checks.
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const workflowsDir = path.join(root, ".github", "workflows");
const workflowExtensions = new Set([".yml", ".yaml"]);

function listWorkflowFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && workflowExtensions.has(path.extname(entry.name)))
    .map((entry) => path.join(dir, entry.name));
}

function main() {
  const workflowFiles = listWorkflowFiles(workflowsDir);
  if (workflowFiles.length) {
    throw new Error(
      `GitHub Actions workflow file(s) found: ${workflowFiles
        .map((file) => path.relative(root, file))
        .join(", ")}`,
    );
  }

  console.log("check-ci-workflows: OK (Vercel-only deploy contract; no GitHub Actions workflow files)");
}

try {
  main();
} catch (err) {
  console.error(`check-ci-workflows: FAIL (${err instanceof Error ? err.message : String(err)})`);
  process.exit(1);
}
