#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assertIncludes(rel, needles) {
  const source = read(rel);
  for (const needle of needles) {
    if (!source.includes(needle)) {
      failures.push(`${rel}: missing ${JSON.stringify(needle)}`);
    }
  }
}

function assertAny(rel, needles) {
  const source = read(rel);
  if (!needles.some((needle) => source.includes(needle))) {
    failures.push(`${rel}: missing one of ${needles.map((needle) => JSON.stringify(needle)).join(", ")}`);
  }
}

const guardedRoutes = [
  "src/app/api/data/classes/route.ts",
  "src/app/api/data/classes/[id]/roster/route.ts",
  "src/app/api/data/teachers/route.ts",
  "src/app/api/data/parents/route.ts",
  "src/app/api/data/students/route.ts",
  "src/app/api/data/feedback/route.ts",
  "src/app/api/data/schedule-extras/route.ts",
  "src/app/api/data/me/route.ts",
  "src/app/api/data/notifications/route.ts",
  "src/app/api/data/enrichment-requests/route.ts",
  "src/app/api/data/support-tickets/route.ts",
];

for (const rel of guardedRoutes) {
  assertAny(rel, [
    "requireRemoteApiSession",
    "loadCurrentApiUser",
    "requireCurrentApiUser",
    "createGetRoute(",
  ]);
}

assertIncludes("src/app/api/admin/users/route.ts", [
  "requireAdmin()",
  "Administrator role required.",
  "audit_events",
]);

assertIncludes("src/app/api/data/students/[id]/profile/route.ts", [
  "Administrator role required.",
  "student.profile.update",
  "student.competency_levels.replace",
  "student.record.create",
]);

assertIncludes("src/app/api/data/students/[id]/avatar/route.ts", [
  "requireParentStudentAccess",
  "Only linked parents or administrators can update this student photo.",
  "student.avatar.update",
]);

assertIncludes("src/app/api/data/schedule-extras/route.ts", [
  "serverInsertScheduleEvent",
  "requireRemoteApiSession",
]);

assertIncludes("src/app/api/data/approval-history/route.ts", [
  "createGetRoute",
  "fetchApprovalHistoryResolved",
]);

if (failures.length > 0) {
  console.error("API auth guard check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("API auth guard check passed.");
