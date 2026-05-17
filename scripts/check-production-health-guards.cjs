#!/usr/bin/env node
/*
 * Starts the production build and verifies /api/health exposes the locked-down
 * non-secret production guard booleans expected by the scheduled monitor.
 */

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const root = path.join(__dirname, "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const buildIdPath = path.join(root, ".next", "BUILD_ID");

const REQUIRED_GUARDS = [
  "requireRemoteData",
  "demoLoginDisabled",
  "testPersonaUiDisabled",
  "figmaCaptureDisabled",
  "mockNotificationHeaderDisabled",
  "signupInviteConfigured",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === "string") {
          reject(new Error("Could not allocate a local port"));
          return;
        }
        resolve(address.port);
      });
    });
  });
}

async function fetchWithTimeout(url, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { accept: "application/json" },
      redirect: "manual",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForHealth(baseUrl, child) {
  let lastError = "";
  for (let i = 0; i < 50; i += 1) {
    if (child.exitCode !== null) {
      throw new Error(`next start exited early with code ${child.exitCode}`);
    }
    try {
      const res = await fetchWithTimeout(`${baseUrl}/api/health`);
      if (res.status === 200) return res;
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await sleep(200);
  }
  throw new Error(`Timed out waiting for /api/health (${lastError})`);
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`Usage:
  npm run build
  npm run check:production-health-guards

Checks:
  - Starts the built app with locked-down production public flags
  - Verifies /api/health returns all productionGuards as true
  - Does not require Supabase credentials or access tokens
`);
    return;
  }

  if (!fs.existsSync(buildIdPath)) {
    throw new Error("Missing .next/BUILD_ID. Run `npm run build` before this check.");
  }

  const port = process.env.CIA_HEALTH_GUARD_PORT || String(await freePort());
  const baseUrl = `http://127.0.0.1:${port}`;
  const childEnv = {
    ...process.env,
    NEXT_PUBLIC_REQUIRE_REMOTE_DATA: "true",
    NEXT_PUBLIC_ENABLE_DEMO_LOGIN: "false",
    NEXT_PUBLIC_ENABLE_TEST_PERSONA_UI: "false",
    NEXT_PUBLIC_ENABLE_FIGMA_CAPTURE: "false",
    NEXT_PUBLIC_ENABLE_MOCK_NOTIFICATION_HEADER: "false",
    NEXT_PUBLIC_SIGNUP_INVITE_CODE: "health-guard-check",
    PORT: port,
  };

  const child = spawn(process.execPath, [nextBin, "start", "-p", port], {
    cwd: root,
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  try {
    const res = await waitForHealth(baseUrl, child);
    const contentType = res.headers.get("content-type") || "";
    assert(contentType.includes("application/json"), `/api/health should return JSON, got ${contentType || "(missing)"}`);
    const body = await res.json();
    assert(body && body.ok === true, "/api/health missing ok:true");
    assert(body.service === "curious-innovators-academy", "/api/health service mismatch");
    const guards = body.productionGuards || {};
    for (const guard of REQUIRED_GUARDS) {
      assert(guards[guard] === true, `/api/health productionGuards.${guard} must be true`);
    }
    console.log(`check-production-health-guards: OK (${REQUIRED_GUARDS.length} production guard(s) true)`);
  } catch (err) {
    const tail = output.trim().split("\n").slice(-20).join("\n");
    const detail = tail ? `\n\nnext start output:\n${tail}` : "";
    throw new Error(`${err instanceof Error ? err.message : String(err)}${detail}`);
  } finally {
    child.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
