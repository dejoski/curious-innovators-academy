#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const repository = read("src/lib/data/repositories/history.ts");
const studentRoute = read("src/app/api/data/students/[id]/schedule-history/route.ts");
const classRoute = read("src/app/api/data/classes/[id]/history/route.ts");
const authGuardCheck = read("scripts/check-api-auth-guards.cjs");

for (const expected of [
  'const STUDENT_SCHEDULE_SNAPSHOTS_TABLE = "student_schedule_snapshots"',
  'const CLASS_SNAPSHOTS_TABLE = "class_snapshots"',
  "export function mapStudentScheduleSnapshotRow",
  "export function mapClassSnapshotRow",
  "export async function recordStudentScheduleSnapshot",
  "export async function recordClassSnapshot",
  "export async function fetchStudentScheduleHistoryResolved",
  "export async function fetchAdminStudentScheduleHistoryResolved",
  "export async function fetchClassSnapshotHistoryResolved",
  "export async function fetchAdminClassSnapshotHistoryResolved",
  "snapshot",
  "payload",
]) {
  assert.ok(repository.includes(expected), `history repository missing ${expected}`);
}

for (const slot of [
  "b1",
  "b1Tue",
  "b1Wed",
  "b1Thu",
  "b2",
  "b2Tue",
  "b2Wed",
  "b2Thu",
  "b3Tue",
  "b3Wed",
  "b3Thu",
  "b4Tue",
  "b4Wed",
  "b4Thu",
]) {
  assert.ok(repository.includes(`"${slot}"`), `history repository missing schedule slot ${slot}`);
}

for (const dbColumn of [
  "source_action",
  "source_entity_type",
  "source_entity_id",
  "actor_profile_id",
  "created_at",
]) {
  assert.ok(repository.includes(dbColumn), `history repository missing snapshot table column ${dbColumn}`);
}

for (const snapshotField of [
  "scheduleState",
  "finalizedAt",
  "incompleteBlocks",
  "hasConflicts",
  "conflicts",
  "b1_tue",
  "b2_tue",
  "b3_tue",
  "b4_tue",
  "b1_wed",
  "b2_wed",
  "b3_wed",
  "b4_wed",
  "b1_thu",
  "b2_thu",
  "b3_thu",
  "b4_thu",
]) {
  assert.ok(repository.includes(snapshotField), `history repository missing schedule snapshot field ${snapshotField}`);
}

assert.ok(repository.includes('.order("created_at", { ascending: false })'), "history reads must order by migration created_at column");
assert.doesNotMatch(repository, /schedule_state:\s*row\.scheduleState/, "student snapshot writes must not require a normalized schedule_state column");
assert.doesNotMatch(repository, /recorded_by_profile_id:/, "snapshot writes must use migration actor_profile_id column");

for (const field of [
  "name",
  "program",
  "semesterId",
  "semesterName",
  "teacherId",
  "teacher",
  "block",
  "level",
  "schedule",
  "scheduleDays",
  "room",
  "location",
  "status",
  "isActive",
  "archivedAt",
  "minAgeYears",
  "maxAgeYears",
  "capacity",
]) {
  assert.ok(repository.includes(field), `history repository missing class snapshot field ${field}`);
}

for (const expected of [
  "loadCurrentApiUser",
  "isParentRole",
  "requireParentStudentAccess",
  "fetchStudentScheduleHistoryResolved",
  "fetchAdminStudentScheduleHistoryResolved",
  "Only linked parents or administrators can read this student schedule history.",
]) {
  assert.ok(studentRoute.includes(expected), `student schedule history route missing ${expected}`);
}

for (const expected of [
  "loadCurrentApiUser",
  '.from("profiles")',
  '.select("role")',
  "Administrator role required.",
  "fetchAdminClassSnapshotHistoryResolved",
]) {
  assert.ok(classRoute.includes(expected), `class history route missing ${expected}`);
}

for (const rel of [
  "src/app/api/data/students/[id]/schedule-history/route.ts",
  "src/app/api/data/classes/[id]/history/route.ts",
]) {
  assert.ok(authGuardCheck.includes(rel), `auth guard checker missing ${rel}`);
}

console.log("history repository/API static regression passed");
