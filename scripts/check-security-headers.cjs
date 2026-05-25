#!/usr/bin/env node
/*
 * Starts the built app and verifies production security headers are served on
 * both page and API responses. This catches accidental removal from
 * next.config.ts instead of only checking config text.
 */

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const root = path.join(__dirname, "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const buildIdPath = path.join(root, ".next", "BUILD_ID");

const REQUIRED_HEADERS = {
  "content-security-policy": [
    "default-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
  ],
  "cross-origin-opener-policy": ["same-origin"],
  "permissions-policy": [
    "camera=()",
    "microphone=()",
    "geolocation=()",
    "payment=()",
    "usb=()",
  ],
  "referrer-policy": ["strict-origin-when-cross-origin"],
  "strict-transport-security": ["max-age=63072000", "includeSubDomains", "preload"],
  "x-content-type-options": ["nosniff"],
  "x-frame-options": ["DENY"],
};

const FORBIDDEN_HEADER_PARTS = {
  "content-security-policy": ["unsafe-eval"],
};

const CHECK_PATHS = ["/login", "/api/health"];

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
      headers: { accept: "text/html,application/json" },
      redirect: "manual",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForApp(baseUrl, child) {
  let lastError = "";
  for (let i = 0; i < 50; i += 1) {
    if (child.exitCode !== null) {
      throw new Error(`next start exited early with code ${child.exitCode}`);
    }
    try {
      const res = await fetchWithTimeout(`${baseUrl}/login`);
      if (res.status === 200) return;
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await sleep(200);
  }
  throw new Error(`Timed out waiting for built app (${lastError})`);
}

function assertSecurityHeaders(res, pathName) {
  for (const [header, requiredParts] of Object.entries(REQUIRED_HEADERS)) {
    const value = res.headers.get(header) || "";
    assert(value, `${pathName} missing ${header}`);
    for (const part of requiredParts) {
      assert(
        value.includes(part),
        `${pathName} ${header} missing "${part}" in "${value}"`,
      );
    }
  }
  for (const [header, forbiddenParts] of Object.entries(FORBIDDEN_HEADER_PARTS)) {
    const value = res.headers.get(header) || "";
    for (const part of forbiddenParts) {
      assert(!value.includes(part), `${pathName} ${header} must not include "${part}"`);
    }
  }
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`Usage:
  npm run build
  npm run check:security-headers

Checks:
  - Starts the built app locally
  - Verifies CSP, frame, content-type, HSTS, referrer, permissions, and opener headers
  - Checks both /login and /api/health responses
`);
    return;
  }

  if (!fs.existsSync(buildIdPath)) {
    throw new Error("Missing .next/BUILD_ID. Run `npm run build` before this check.");
  }

  const port = process.env.CIA_SECURITY_HEADER_PORT || String(await freePort());
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [nextBin, "start", "-p", port], {
    cwd: root,
    env: {
      ...process.env,
      NEXT_PUBLIC_REQUIRE_REMOTE_DATA: "true",
      NEXT_PUBLIC_ENABLE_DEMO_LOGIN: "false",
      NEXT_PUBLIC_ENABLE_TEST_PERSONA_UI: "false",
      NEXT_PUBLIC_ENABLE_MOCK_NOTIFICATION_HEADER: "false",
      NEXT_PUBLIC_SIGNUP_INVITE_CODE: "security-header-check",
      PORT: port,
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

  try {
    await waitForApp(baseUrl, child);
    for (const pathName of CHECK_PATHS) {
      const res = await fetchWithTimeout(`${baseUrl}${pathName}`);
      assert(res.status === 200, `${pathName} should return HTTP 200, got ${res.status}`);
      assertSecurityHeaders(res, pathName);
    }
    console.log(
      `check-security-headers: OK (${Object.keys(REQUIRED_HEADERS).length} header(s) on ${CHECK_PATHS.length} route(s))`,
    );
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
