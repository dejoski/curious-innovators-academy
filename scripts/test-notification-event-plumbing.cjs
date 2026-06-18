const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

const serverWrites = read("src/lib/data/server-writes.ts");
const dashboardRepo = read("src/lib/data/repositories/dashboard.ts");

assert.match(serverWrites, /async function writeClassRequestSubmittedNotifications/);
assert.match(serverWrites, /async function writeScheduleAttentionNotifications/);
assert.match(serverWrites, /async function recordStudentScheduleMutationSnapshot/);
assert.match(serverWrites, /async function recordStudentScheduleMutationSnapshots/);
assert.match(serverWrites, /async function recordClassScheduleMutationSnapshots/);
assert.match(serverWrites, /async function selectScheduleAffectedStudentIdsForClass/);
assert.match(serverWrites, /recordStudentScheduleSnapshot/);
assert.match(serverWrites, /recordClassSnapshot/);
assert.match(serverWrites, /\.eq\("recipient_profile_id", row\.recipient_profile_id\)/);
assert.match(serverWrites, /\.eq\("title", row\.title\)/);
assert.match(serverWrites, /\.eq\("href", row\.href\)/);
assert.match(serverWrites, /\.eq\("body", row\.body\)/);
assert.match(serverWrites, /\.is\("read_at", null\)/);
assert.match(serverWrites, /\.from\("notifications"\)\.insert\(missing\)/);
assert.match(serverWrites, /title: "Schedule action needed"/);
assert.match(serverWrites, /title: "Schedule conflict detected"/);
assert.match(serverWrites, /function isWaitlistRequestNotificationRow/);
assert.match(serverWrites, /"New waitlist request submitted"/);
assert.match(serverWrites, /"Waitlist request submitted"/);
assert.match(serverWrites, /"New class request submitted"/);
assert.match(serverWrites, /href: "\/dashboard\/classes\/requests"/);
assert.match(serverWrites, /"Class request submitted"/);
assert.match(serverWrites, /href: "\/dashboard\/parents\/catalog"/);
assert.match(serverWrites, /async function writeClassCapacityReachedNotifications/);
assert.match(serverWrites, /title: "Class reached capacity"/);
assert.match(serverWrites, /selectClassCapacitySnapshots\(admin, reservingClassIds\)/);
assert.match(serverWrites, /writeClassCapacityReachedNotifications\(admin/);
assert.match(serverWrites, /writeClassCapacityReachedNotifications\(capacityClient/);
assert.match(serverWrites, /async function writeClassRequestDecisionNotification/);
assert.match(serverWrites, /"Class request approved"/);
assert.match(serverWrites, /"Class request waitlisted"/);
assert.match(serverWrites, /"Class request rejected"/);
assert.match(serverWrites, /writeClassRequestSubmittedNotifications\(admin/);
assert.match(serverWrites, /writeClassRequestSubmittedNotifications\(capacityClient/);
assert.match(serverWrites, /writeClassRequestDecisionNotification\(mutationClient/);
assert.match(serverWrites, /sourceAction:\s*"class\.create"/);
assert.match(serverWrites, /sourceAction:\s*"class\.update"/);
assert.match(serverWrites, /sourceAction:\s*"class\.archive"/);
assert.match(serverWrites, /"class\.activate"/);
assert.match(serverWrites, /"class\.deactivate"/);
assert.match(serverWrites, /sourceAction:\s*"enrollment\.status\.update"/);
assert.match(serverWrites, /sourceAction:\s*"enrollment\.delete"/);
assert.match(serverWrites, /sourceAction:\s*"enrollment\.create"/);
assert.match(serverWrites, /sourceAction:\s*"enrollment\.student\.update"/);
assert.match(serverWrites, /sourceAction:\s*"class_request\.create"/);
assert.match(serverWrites, /sourceAction:\s*"class_request\.reopen"/);
assert.match(serverWrites, /sourceAction:\s*"class_request\.status\.update"/);
assert.match(serverWrites, /sourceAction:\s*"class_request\.delete"/);
assert.match(serverWrites, /if \(!snapshot\.ok\) return snapshot/g);
assert.match(serverWrites, /serverPatchEnrollmentStatus/);
assert.match(serverWrites, /serverInsertRosterStudent/);
assert.match(serverWrites, /serverUpdateRosterStudent/);
assert.match(serverWrites, /serverDeleteEnrollment/);
assert.match(serverWrites, /serverInsertEnrichmentRequests/);
assert.match(serverWrites, /serverPatchEnrichmentRequest/);
assert.match(serverWrites, /serverDeleteEnrichmentRequest/);

assert.match(dashboardRepo, /fetchAdminStudentSchedulesResolved/);
assert.match(dashboardRepo, /id: "incomplete-student-schedules"/);
assert.match(dashboardRepo, /id: "student-schedule-conflicts"/);
assert.match(dashboardRepo, /systemAlerts: \[\.\.\.scheduleAlerts, \.\.\.parentLinkAlerts\]/);

console.log("notification event plumbing regression passed");
