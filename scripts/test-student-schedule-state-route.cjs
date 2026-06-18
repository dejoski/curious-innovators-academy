const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

const route = fs.readFileSync(
  path.join(root, "src/app/api/data/students/[id]/schedule/route.ts"),
  "utf8",
);
assert.match(route, /updateStudentScheduleStateResolved/);
assert.match(route, /recordTeacherScheduleConflictOverrideResolved/);
assert.match(route, /export async function PATCH/);
assert.match(route, /parseScheduleState\(body\?\.state\)/);
assert.match(route, /parseTeacherConflictOverride\(body\)/);
assert.match(route, /recordTeacherConflictOverride/);
assert.match(route, /Administrator role required\./);
assert.match(route, /finalizedByProfileId:\s*current\.user\.id/);
assert.match(route, /recordedByProfileId:\s*current\.user\.id/);
assert.match(route, /overrideId:\s*result\.overrideId/);
assert.match(route, /Schedule state must be draft, pending, or finalized\./);

const repository = fs.readFileSync(
  path.join(root, "src/lib/data/repositories/student-details.ts"),
  "utf8",
);
assert.match(repository, /if \(normalizedState === "finalized"\)/);
assert.match(repository, /cannot be finalized yet/);
assert.match(repository, /has a conflict and cannot be finalized/);
assert.match(repository, /writeStudentScheduleFinalizedNotifications/);
assert.match(repository, /title: "Schedule finalized"/);
assert.match(repository, /previousScheduleState !== "finalized"/);
assert.match(repository, /recordStudentScheduleSnapshot/);
assert.match(repository, /sourceAction:\s*"student_schedule_state\.update"/);
assert.match(repository, /writeScheduleAttentionNotifications/);
assert.match(repository, /insertUnreadNotificationsIfAbsent/);
assert.match(repository, /from\("student_schedule_states"\)/);
assert.match(repository, /from\("teacher_conflict_overrides"\)/);
assert.match(repository, /finalized_by:\s*finalizedBy/);
assert.match(repository, /finalized_at:\s*finalizedAt/);
assert.match(repository, /writeScheduleStateAuditEvent/);
assert.match(repository, /writeScheduleConflictOverrideAuditEvent/);
assert.match(repository, /action:\s*"student_schedule_state\.update"/);
assert.match(repository, /action:\s*"schedule_conflict\.override"/);
assert.match(repository, /entity_type:\s*"student"/);
assert.match(repository, /semesterId/);

console.log("student schedule state route regression passed");
