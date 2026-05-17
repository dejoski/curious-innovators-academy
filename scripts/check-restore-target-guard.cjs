#!/usr/bin/env node
/*
 * Ensures restore-target verification refuses to run against the production
 * Supabase project ref before any networked Auth/RLS checks can occur.
 */

const path = require("path");
const { spawn } = require("child_process");

const root = path.join(__dirname, "..");
const script = path.join(__dirname, "verify-production-readiness.cjs");
const productionRef = "production-ref-guard";
const expected = "restore-target verification is pointing at the production Supabase project";

const child = spawn(process.execPath, [script], {
  cwd: root,
  env: {
    ...process.env,
    CIA_VERIFY_RESTORE_TARGET: "true",
    CIA_PRODUCTION_SUPABASE_PROJECT_REF: productionRef,
    NEXT_PUBLIC_SUPABASE_URL: `https://${productionRef}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "dummy-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "dummy-service-role-key",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
child.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
child.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

child.on("close", (code) => {
  if (code === 0) {
    console.error("FAIL: restore-target verifier accepted the production project ref");
    process.exit(1);
  }
  if (!output.includes(expected)) {
    console.error("FAIL: restore-target verifier failed for an unexpected reason");
    console.error(output.trim());
    process.exit(1);
  }
  console.log("check-restore-target-guard: OK (restore-target verifier refuses production project ref)");
});
