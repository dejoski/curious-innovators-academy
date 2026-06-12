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
assert.match(serverWrites, /\.from\("notifications"\)\.insert\(payload\)/);
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

assert.match(dashboardRepo, /fetchAdminStudentSchedulesResolved/);
assert.match(dashboardRepo, /id: "incomplete-student-schedules"/);
assert.match(dashboardRepo, /id: "student-schedule-conflicts"/);
assert.match(dashboardRepo, /systemAlerts: \[\.\.\.scheduleAlerts, \.\.\.parentLinkAlerts\]/);

console.log("notification event plumbing regression passed");
