#!/usr/bin/env node
/*
 * Keeps GitHub Actions aligned with the production-readiness contract. The
 * docs and checklist are only useful if CI actually runs the gates they cite.
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const ciWorkflow = path.join(root, ".github", "workflows", "ci.yml");
const productionMonitorWorkflow = path.join(root, ".github", "workflows", "production-monitor.yml");

const REQUIRED_CI_SNIPPETS = [
  "npm ci",
  "npm run lint",
  "npm run check:routes",
  "npm run check:workspace-hygiene",
  "npm run check:operator-scripts",
  "npm run check:ci-workflows",
  "npm run check:production-todo",
  "npm run check:env-contract",
  "npm run check:data-boundaries",
  "npm run check:api-auth-guards",
  "npm run check:sql-security",
  "npm run check:server-secret-boundaries",
  "npm run check:restore-target-guard",
  "npm audit --audit-level=moderate",
  "npm run build",
  "NEXT_PUBLIC_REQUIRE_REMOTE_DATA: \"true\"",
  "NEXT_PUBLIC_ENABLE_DEMO_LOGIN: \"false\"",
  "NEXT_PUBLIC_ENABLE_TEST_PERSONA_UI: \"false\"",
  "NEXT_PUBLIC_ENABLE_FIGMA_CAPTURE: \"false\"",
  "NEXT_PUBLIC_ENABLE_MOCK_NOTIFICATION_HEADER: \"false\"",
  "NEXT_PUBLIC_SIGNUP_INVITE_CODE: \"ci-production-health-check\"",
  "npm run check:production-health-guards",
  "npm run check:security-headers",
  "npm run check:production-auth-guard",
  "CIA_AUTH_GUARD_INVALID_SUPABASE=true npm run check:production-auth-guard",
  "CIA_AUTH_GUARD_FAKE_SUPABASE=true npm run check:production-auth-guard",
  "npx playwright install --with-deps chromium",
  "npm run check:responsive",
  "npm run test:e2e",
  "NEXT_PUBLIC_ENABLE_DEMO_LOGIN: \"true\"",
  "NEXT_PUBLIC_REQUIRE_REMOTE_DATA: \"false\"",
];

const REQUIRED_MONITOR_SNIPPETS = [
  "schedule:",
  "cron: \"*/5 * * * *\"",
  "npm run monitor:production",
  "CIA_APP_URL: https://curious-innovators-academy.vercel.app",
];

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`missing workflow: ${path.relative(root, filePath)}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function assertContains(content, snippets, label) {
  const missing = snippets.filter((snippet) => !content.includes(snippet));
  if (missing.length) {
    throw new Error(`${label} is missing required snippet(s): ${missing.join(", ")}`);
  }
}

function main() {
  const ci = readRequiredFile(ciWorkflow);
  const monitor = readRequiredFile(productionMonitorWorkflow);

  assertContains(ci, REQUIRED_CI_SNIPPETS, ".github/workflows/ci.yml");
  assertContains(monitor, REQUIRED_MONITOR_SNIPPETS, ".github/workflows/production-monitor.yml");

  console.log(
    `check-ci-workflows: OK (${REQUIRED_CI_SNIPPETS.length} CI gate snippet(s), ${REQUIRED_MONITOR_SNIPPETS.length} monitor snippet(s))`,
  );
}

try {
  main();
} catch (err) {
  console.error(`check-ci-workflows: FAIL (${err instanceof Error ? err.message : String(err)})`);
  process.exit(1);
}
