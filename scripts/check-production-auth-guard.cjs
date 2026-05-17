#!/usr/bin/env node
/*
 * Starts the production build with production fail-closed flags, then verifies
 * dashboard routes and data APIs fail closed when Supabase env is missing,
 * malformed, or unavailable at runtime.
 */

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const root = path.join(__dirname, "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const buildIdPath = path.join(root, ".next", "BUILD_ID");

const SUPABASE_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
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

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function startFakeSupabase() {
  let requestCount = 0;
  const server = http.createServer((_req, res) => {
    requestCount += 1;
    res.writeHead(503, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "fake Supabase auth is unavailable" }));
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not start fake Supabase server"));
        return;
      }
      resolve({
        close: () => closeServer(server),
        getRequestCount: () => requestCount,
        url: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

function createFakeSessionCookie(supabaseUrl) {
  const hostPrefix = new URL(supabaseUrl).hostname.split(".")[0];
  const storageKey = `sb-${hostPrefix}-auth-token`;
  const session = {
    access_token: "fake-access-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "fake-refresh-token",
    user: {
      id: "00000000-0000-4000-8000-000000000000",
      aud: "authenticated",
      role: "authenticated",
      email: "demo-parent@example.test",
    },
  };
  const encoded = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  return `${storageKey}=base64-${encoded}`;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForServer(baseUrl, child) {
  let lastError = "";
  for (let i = 0; i < 50; i += 1) {
    if (child.exitCode !== null) {
      throw new Error(`next start exited early with code ${child.exitCode}`);
    }
    try {
      const res = await fetchWithTimeout(`${baseUrl}/login`, { redirect: "manual" });
      if (res.status === 200) return;
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await sleep(200);
  }
  throw new Error(`Timed out waiting for next start (${lastError})`);
}

async function expectRedirect(baseUrl, pathName, expectedLocation, headers = {}) {
  const res = await fetchWithTimeout(`${baseUrl}${pathName}`, {
    headers,
    redirect: "manual",
  });
  const location = res.headers.get("location") || "";
  assert(
    res.status === 307 || res.status === 308,
    `${pathName} should redirect with 307/308, got ${res.status}`,
  );
  assert(
    location === expectedLocation,
    `${pathName} should redirect to ${expectedLocation}, got ${location || "(missing)"}`,
  );
}

async function expectJsonStatus(
  baseUrl,
  pathName,
  expectedStatus,
  expectedError,
  headers = {},
  init = {},
) {
  const res = await fetchWithTimeout(`${baseUrl}${pathName}`, {
    ...init,
    headers,
    redirect: "manual",
  });
  assert(
    res.status === expectedStatus,
    `${pathName} should return HTTP ${expectedStatus}, got ${res.status}`,
  );
  const contentType = res.headers.get("content-type") || "";
  assert(
    contentType.includes("application/json"),
    `${pathName} should return JSON, got content-type ${contentType || "(missing)"}`,
  );
  const body = await res.json();
  assert(
    body && body.error === expectedError,
    `${pathName} should return error "${expectedError}", got ${JSON.stringify(body)}`,
  );
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log(`Usage:
  npm run build
  npm run check:production-auth-guard

Checks:
  - Starts the built app with NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true
  - Clears Supabase env vars in the child process
  - Optionally sets malformed Supabase env when CIA_AUTH_GUARD_INVALID_SUPABASE=true
  - Optionally points to a fake failing auth server when CIA_AUTH_GUARD_FAKE_SUPABASE=true
  - Verifies dashboard routes redirect to /login?auth=configuration
  - Verifies protected data APIs return JSON 503 instead of fallback data
  - Verifies protected write/admin APIs also fail closed before parsing payloads
`);
    return;
  }

  if (!fs.existsSync(buildIdPath)) {
    throw new Error("Missing .next/BUILD_ID. Run `npm run build` before this check.");
  }

  const port = process.env.CIA_AUTH_GUARD_PORT || String(await freePort());
  const baseUrl = `http://127.0.0.1:${port}`;
  const childEnv = { ...process.env };
  let fakeSupabase = null;
  let authHeaders = {};
  let expectedApiError = "Supabase is not configured.";
  for (const key of SUPABASE_ENV) childEnv[key] = "";
  childEnv.NEXT_PUBLIC_REQUIRE_REMOTE_DATA = "true";
  childEnv.NEXT_PUBLIC_ENABLE_DEMO_LOGIN = "false";
  if (process.env.CIA_AUTH_GUARD_INVALID_SUPABASE === "true") {
    childEnv.NEXT_PUBLIC_SUPABASE_URL = "not-a-valid-url";
    childEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-anon-key";
  }
  if (process.env.CIA_AUTH_GUARD_FAKE_SUPABASE === "true") {
    fakeSupabase = await startFakeSupabase();
    childEnv.NEXT_PUBLIC_SUPABASE_URL = fakeSupabase.url;
    childEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-anon-key";
    authHeaders = { cookie: createFakeSessionCookie(fakeSupabase.url) };
    expectedApiError = "Supabase session check failed.";
  }
  childEnv.PORT = port;

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
    await waitForServer(baseUrl, child);
    await expectRedirect(baseUrl, "/dashboard", "/login?auth=configuration", authHeaders);
    await expectRedirect(
      baseUrl,
      "/dashboard/classes",
      "/login?auth=configuration",
      authHeaders,
    );
    await expectJsonStatus(baseUrl, "/api/data/students", 503, expectedApiError, authHeaders);
    await expectJsonStatus(baseUrl, "/api/data/me", 503, expectedApiError, authHeaders);
    await expectJsonStatus(
      baseUrl,
      "/api/dashboard-presentation",
      503,
      expectedApiError,
      authHeaders,
    );
    await expectJsonStatus(
      baseUrl,
      "/api/data/students",
      503,
      expectedApiError,
      { ...authHeaders, "content-type": "application/json" },
      { method: "POST", body: JSON.stringify({ name: "Auth Guard Student" }) },
    );
    await expectJsonStatus(
      baseUrl,
      "/api/data/classes",
      503,
      expectedApiError,
      { ...authHeaders, "content-type": "application/json" },
      { method: "PATCH", body: JSON.stringify({ id: "class-auth-guard", name: "Auth Guard Class" }) },
    );
    await expectJsonStatus(
      baseUrl,
      "/api/data/classes/class-auth-guard/roster",
      503,
      expectedApiError,
      { ...authHeaders, "content-type": "application/json" },
      { method: "POST", body: JSON.stringify({ name: "Auth Guard Roster Student" }) },
    );
    await expectJsonStatus(
      baseUrl,
      "/api/data/students/student-auth-guard/profile",
      503,
      expectedApiError,
      { ...authHeaders, "content-type": "application/json" },
      { method: "POST", body: JSON.stringify({ title: "Guard", content: "Blocked before write." }) },
    );
    await expectJsonStatus(
      baseUrl,
      "/api/data/support-tickets",
      503,
      expectedApiError,
      { ...authHeaders, "content-type": "application/json" },
      { method: "POST", body: JSON.stringify({ subject: "Guard", message: "Blocked before write." }) },
    );
    await expectJsonStatus(
      baseUrl,
      "/api/admin/users",
      503,
      expectedApiError,
      { ...authHeaders, "content-type": "application/json" },
      { method: "POST", body: JSON.stringify({ email: "guard@example.test", displayName: "Guard" }) },
    );
    if (fakeSupabase) {
      assert(
        fakeSupabase.getRequestCount() > 0,
        "fake Supabase server should receive at least one auth request",
      );
    }
    const login = await fetchWithTimeout(`${baseUrl}/login`, { redirect: "manual" });
    assert(login.status === 200, `/login should render, got ${login.status}`);
    console.log("check-production-auth-guard: OK (dashboard, data APIs, write APIs, and admin APIs fail closed)");
  } catch (err) {
    const tail = output.trim().split("\n").slice(-20).join("\n");
    const detail = tail ? `\n\nnext start output:\n${tail}` : "";
    throw new Error(`${err instanceof Error ? err.message : String(err)}${detail}`);
  } finally {
    child.kill("SIGTERM");
    if (fakeSupabase) await fakeSupabase.close();
  }
}

main().catch((err) => {
  console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
