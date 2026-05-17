#!/usr/bin/env node
/*
 * Keeps production/operator tooling loadable without requiring secrets.
 * CI runs this before build so broken launch, restore, backup, and monitor
 * scripts are caught even when their full live checks need operator env.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const scriptsDir = path.join(root, "scripts");

const HELP_SCRIPTS = [
  "check-production-auth-guard.cjs",
  "check-production-health-guards.cjs",
  "check-security-headers.cjs",
  "check-supabase-backups.cjs",
  "drill-logical-backup-restore.cjs",
  "monitor-production.cjs",
  "provision-supabase-users.cjs",
  "verify-production-readiness.cjs",
];

function runNode(args) {
  execFileSync(process.execPath, args, {
    cwd: root,
    env: {
      ...process.env,
      // Keep help/syntax checks independent from local operator secrets.
      SUPABASE_ACCESS_TOKEN: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function main() {
  const scripts = fs
    .readdirSync(scriptsDir)
    .filter((name) => name.endsWith(".cjs"))
    .sort();

  for (const script of scripts) {
    runNode(["--check", path.join("scripts", script)]);
  }

  for (const script of HELP_SCRIPTS) {
    const full = path.join(scriptsDir, script);
    if (!fs.existsSync(full)) throw new Error(`missing help-checked script: ${script}`);
    runNode([path.join("scripts", script), "--help"]);
  }

  console.log(
    `check-operator-scripts: OK (${scripts.length} script(s) syntax-checked, ${HELP_SCRIPTS.length} help screen(s) checked)`,
  );
}

try {
  main();
} catch (err) {
  console.error(`check-operator-scripts: FAIL (${err instanceof Error ? err.message : String(err)})`);
  process.exit(1);
}
