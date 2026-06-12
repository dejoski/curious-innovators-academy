const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

const repository = read("src/lib/data/repositories/audit-events.ts");
const route = read("src/app/api/data/audit-events/route.ts");
const serverWrites = read("src/lib/data/server-writes.ts");

assert.match(repository, /requireAdminReadClient/);
assert.match(repository, /\.from\("audit_events"\)/);
assert.match(repository, /actor_profile:profiles!audit_events_actor_profile_id_fkey/);
assert.match(repository, /MAX_AUDIT_LIMIT = 2000/);
assert.match(repository, /export function auditEventsToCsv/);
assert.match(repository, /metadata/);

assert.match(route, /requireRemoteApiSession/);
assert.match(route, /fetchAdminAuditEventsResolved/);
assert.match(route, /searchParams\.get\("format"\) === "csv"/);
assert.match(route, /Content-Disposition/);
assert.match(route, /auditEvents: result\.items/);

assert.match(serverWrites, /action: "class\.create"/);
assert.match(serverWrites, /action: "class\.update"/);
assert.match(serverWrites, /"class\.archive"/);
assert.match(serverWrites, /"class\.activate"/);
assert.match(serverWrites, /"class\.deactivate"/);

console.log("audit events export regression passed");
