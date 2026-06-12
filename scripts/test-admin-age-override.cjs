const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

const route = read("src/app/api/data/enrichment-requests/route.ts");
const serverWrites = read("src/lib/data/server-writes.ts");

assert.match(route, /allowAgeOverride: body\.allowAgeOverride === true/);
assert.match(serverWrites, /allowAgeOverride\?: boolean/);
assert.match(serverWrites, /currentUserIsAdmin\(supabase, user\.id\)/);
assert.match(serverWrites, /!options\.allowAgeOverride && studentAge !== null && minAge !== null/);
assert.match(serverWrites, /!options\.allowAgeOverride && studentAge !== null && maxAge !== null/);
assert.match(serverWrites, /ageOverride: signedInAdminCanOverrideAge/);

console.log("admin age override regression passed");
