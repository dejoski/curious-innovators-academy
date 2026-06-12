const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const client = fs.readFileSync(
  path.join(root, "src/app/dashboard/students/admin-student-schedule-client.tsx"),
  "utf8",
);

assert.match(client, /type ScheduleStateFilter = ScheduleFilterValue \| StudentScheduleState;/);
assert.match(client, /const SCHEDULE_STATE_OPTIONS[\s\S]*draft[\s\S]*pending[\s\S]*finalized/);
assert.match(client, /fetch\(`\/api\/data\/students\/\$\{encodedId\}\/schedule`, \{/);
assert.match(client, /method: "PATCH"/);
assert.match(client, /body: JSON\.stringify\(\{ state \}\)/);
assert.match(client, /invalidateDashboardData\(\[[\s\S]*\/api\/data\/student-schedules[\s\S]*\/api\/dashboard-presentation/);
assert.match(client, /setStudentFilter/);
assert.match(client, /setClassFilter/);
assert.match(client, /setTeacherFilter/);
assert.match(client, /setBlockFilter/);
assert.match(client, /setStatusFilter/);
assert.match(client, /rowMatchesFilters/);
assert.match(client, /aria-label=\{`Set schedule state for \$\{row\.name\}`\}/);

console.log("admin student schedule client regression passed");
