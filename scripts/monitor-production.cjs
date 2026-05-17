#!/usr/bin/env node
/*
 * External production smoke monitor.
 *
 * Intended for GitHub Actions schedule/manual runs. It checks the deployed app
 * from outside Vercel and fails loudly on health, routing, or auth-regression
 * problems without requiring secrets.
 */

const DEFAULT_APP_URL = "https://curious-innovators-academy.vercel.app";

function appUrl() {
  const raw = process.env.CIA_APP_URL?.trim() || DEFAULT_APP_URL;
  return raw.replace(/\/$/, "");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return { response, elapsedMs: Date.now() - started };
  } finally {
    clearTimeout(timeout);
  }
}

async function expectJson(pathname, status, validate) {
  const url = `${appUrl()}${pathname}`;
  const { response, elapsedMs } = await fetchWithTimeout(url, {
    headers: { accept: "application/json" },
    redirect: "manual",
  });
  assert(
    response.status === status,
    `${pathname} expected HTTP ${status}, got HTTP ${response.status}`,
  );
  const contentType = response.headers.get("content-type") || "";
  assert(
    contentType.includes("application/json"),
    `${pathname} expected JSON, got ${contentType || "(missing content-type)"}`,
  );
  const body = await response.json();
  validate(body);
  return `${pathname} ${status} ${elapsedMs}ms`;
}

async function expectHtml(pathname) {
  const url = `${appUrl()}${pathname}`;
  const { response, elapsedMs } = await fetchWithTimeout(url, {
    headers: { accept: "text/html" },
    redirect: "follow",
  });
  assert(response.ok, `${pathname} expected 2xx, got HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  assert(
    contentType.includes("text/html"),
    `${pathname} expected HTML, got ${contentType || "(missing content-type)"}`,
  );
  const body = await response.text();
  assert(/<html/i.test(body), `${pathname} response does not look like HTML`);
  return `${pathname} ${response.status} ${elapsedMs}ms`;
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`Usage:
  npm run monitor:production

Optional env:
  CIA_APP_URL=https://curious-innovators-academy.vercel.app
`);
    return;
  }

  const checks = [
    await expectJson("/api/health", 200, (body) => {
      assert(body && body.ok === true, "/api/health missing ok:true");
      const guards = body.productionGuards || {};
      assert(
        guards.requireRemoteData === true,
        "/api/health productionGuards.requireRemoteData must be true",
      );
      assert(
        guards.demoLoginDisabled === true,
        "/api/health productionGuards.demoLoginDisabled must be true",
      );
      assert(
        guards.testPersonaUiDisabled === true,
        "/api/health productionGuards.testPersonaUiDisabled must be true",
      );
      assert(
        guards.figmaCaptureDisabled === true,
        "/api/health productionGuards.figmaCaptureDisabled must be true",
      );
      assert(
        guards.mockNotificationHeaderDisabled === true,
        "/api/health productionGuards.mockNotificationHeaderDisabled must be true",
      );
      assert(
        guards.signupInviteConfigured === true,
        "/api/health productionGuards.signupInviteConfigured must be true",
      );
    }),
    await expectJson("/api/version", 200, (body) => {
      assert(body && typeof body.version === "string", "/api/version missing version");
    }),
    await expectJson("/api/data/me", 401, (body) => {
      assert(body && typeof body.error === "string", "/api/data/me missing auth error");
    }),
    await expectJson("/api/data/students", 401, (body) => {
      assert(body && typeof body.error === "string", "/api/data/students missing auth error");
    }),
    await expectJson("/api/dashboard-presentation", 401, (body) => {
      assert(body && typeof body.error === "string", "/api/dashboard-presentation missing auth error");
    }),
    await expectHtml("/login"),
    await expectHtml("/privacy"),
    await expectHtml("/terms"),
  ];

  console.log(`Production monitor OK for ${appUrl()}`);
  for (const check of checks) console.log(`- ${check}`);
}

main().catch((err) => {
  console.error(`Production monitor FAIL for ${appUrl()}:`);
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
