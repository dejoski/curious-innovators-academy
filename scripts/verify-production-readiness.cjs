#!/usr/bin/env node

const DEFAULT_BASE_URL = "https://curious-innovators-academy.vercel.app";

const baseUrl = (process.env.CIA_PRODUCTION_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
const failures = [];

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  try {
    return await fetch(url, {
      redirect: "manual",
      ...options,
    });
  } catch (error) {
    failures.push(`${path}: request failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function expectStatus(path, expectedStatus) {
  const response = await request(path);
  if (!response) return;
  if (response.status !== expectedStatus) {
    failures.push(`${path}: expected HTTP ${expectedStatus}, got ${response.status}`);
  }
}

async function verifyHealth() {
  const response = await request("/api/health");
  if (!response) return;
  if (response.status !== 200) {
    failures.push(`/api/health: expected HTTP 200, got ${response.status}`);
    return;
  }

  const body = await response.json().catch(() => null);
  if (!body?.ok) failures.push("/api/health: ok=true missing");
  const guards = body?.productionGuards ?? {};
  if (guards.requireRemoteData !== true) failures.push("/api/health: requireRemoteData guard is not true");
  if (guards.demoLoginDisabled !== false) failures.push("/api/health: demo login is not enabled");
  if (guards.testPersonaUiDisabled !== true) failures.push("/api/health: test persona UI is not disabled");
  if (guards.mockNotificationHeaderDisabled !== true) failures.push("/api/health: mock notification header is not disabled");
}

async function verifyDemoLogin(kind) {
  const response = await request(`/api/auth/demo-login?kind=${kind}`);
  if (!response) return;
  if (response.status !== 307) {
    failures.push(`/api/auth/demo-login?kind=${kind}: expected HTTP 307, got ${response.status}`);
    return;
  }
  const location = response.headers.get("location") || "";
  if (!location.includes("/dashboard")) {
    failures.push(`/api/auth/demo-login?kind=${kind}: redirect did not target dashboard`);
  }
}

async function main() {
  await verifyHealth();
  await expectStatus("/api/data/audit-events", 401);
  await expectStatus("/api/data/classes/example/history", 401);
  await expectStatus("/api/data/students/example/schedule-history", 401);
  await verifyDemoLogin("admin");
  await verifyDemoLogin("parent");

  if (failures.length > 0) {
    console.error(`Production readiness failed for ${baseUrl}`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Production readiness check passed for ${baseUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
