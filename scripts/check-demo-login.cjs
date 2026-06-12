#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assertIncludes(rel, needle) {
  const source = read(rel);
  if (!source.includes(needle)) {
    failures.push(`${rel}: missing expected text ${JSON.stringify(needle)}`);
  }
}

function assertAny(rel, options) {
  const source = read(rel);
  if (!options.some((needle) => source.includes(needle))) {
    failures.push(
      `${rel}: missing at least one of: ${options.map((o) => JSON.stringify(o)).join(", ")}`,
    );
  }
  return source;
}

assertIncludes("src/app/login/LoginClient.tsx", "const SHOW_DEMO_LOGIN = true;");
assertIncludes("src/app/login/LoginClient.tsx", "const showDemoAdmin = true;");
assertIncludes("src/app/login/LoginClient.tsx", "const showDemoParent = true;");
assertIncludes("src/app/login/LoginClient.tsx", "Continue as Admin");
assertIncludes("src/app/login/LoginClient.tsx", "Continue as Parent");
assertIncludes("src/app/login/LoginClient.tsx", 'continueAsDemo("admin")');
assertIncludes("src/app/login/LoginClient.tsx", 'continueAsDemo("parent")');
assertIncludes("src/app/login/LoginClient.tsx", "/api/auth/demo-login?kind=");

assertIncludes("src/app/api/auth/demo-login/route.ts", "DEMO_ADMIN_EMAIL");
assertIncludes("src/app/api/auth/demo-login/route.ts", "DEMO_PARENT_EMAIL");
assertIncludes("src/app/api/auth/demo-login/route.ts", 'type DemoPersona = "admin" | "parent";');
assertIncludes("src/app/api/auth/demo-login/route.ts", "NextResponse.redirect");
assertIncludes("src/app/api/auth/demo-login/route.ts", "Invalid demo login request.");

assertAny("src/app/api/auth/demo-login/route.ts", [
  "DEMO_LOGIN_ERROR = \"Demo login is not configured.\"",
  "Demo login is not configured.",
]);

if (failures.length > 0) {
  console.error("Demo login contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Demo login contract check passed.");
