const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(this, path.join(root, "src", request.slice(2)), parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const {
  isParentSelectableEnrichmentOption,
  requestKindForOption,
  selectionLabelForOption,
} = require("../src/lib/parent-class-options.ts");
const {
  INITIAL_PARENT_CATALOG_REQUESTS,
  selectedChoicesForSubmit,
} = require("../src/lib/parent-catalog-state.ts");
const { formatRequestOptionLabel } = require("../src/lib/schedule-slots.ts");

const fullClass = {
  id: "full-robotics",
  name: "Robotics Lab",
  teacher: "Teacher",
  description: "Build robots.",
  prerequisites: "None",
  block: "B3",
  level: "1",
  seats: "10/10",
  capacity: 10,
  enrolledCount: 8,
  pendingCount: 2,
  reservedCount: 10,
  seatsRemaining: 0,
  availabilityLabel: "Full",
  status: "Full",
  isActive: true,
  program: "enrichment",
};

assert.equal(selectionLabelForOption(fullClass), "Waitlist available");
assert.equal(requestKindForOption(fullClass), "waitlist");
assert.equal(isParentSelectableEnrichmentOption(fullClass), false);
assert.equal(isParentSelectableEnrichmentOption(fullClass, { allowFullForWaitlist: true }), true);

const waitlistDraft = {
  ...INITIAL_PARENT_CATALOG_REQUESTS,
  block3_day1: {
    firstChoice: {
      id: fullClass.id,
      name: fullClass.name,
      requestKind: "waitlist",
    },
    secondChoice: null,
  },
};

assert.deepEqual(selectedChoicesForSubmit(waitlistDraft), [
  { classId: "full-robotics", block: "B3", level: "1", option: "1st", waitlist: true },
]);
assert.equal(formatRequestOptionLabel("waitlist:2nd"), "Waitlist 2nd choice");

const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20260611170000_exclude_waitlist_requests_from_reserved_capacity.sql"),
  "utf8",
);
assert.match(migration, /option_label,\s*''\)\s+NOT ILIKE 'waitlist:%'/);
assert.match(migration, /option_label,\s*''\)\s+ILIKE 'waitlist:%'/);
assert.match(migration, /reserved_count[\s\S]*COALESCE\(e\.enrolled_count, 0\) \+ COALESCE\(r\.pending_count, 0\)/);
assert.doesNotMatch(migration, /reserved_count[\s\S]*pending_waitlist_count/);

const serverWrites = fs.readFileSync(path.join(root, "src/lib/data/server-writes.ts"), "utf8");
assert.match(serverWrites, /pendingRequestConsumesSeat:\s*!isWaitlistOptionLabel\(raw\.option_label\)/);

const rosterRoute = fs.readFileSync(path.join(root, "src/app/api/data/classes/[id]/roster/route.ts"), "utf8");
assert.match(rosterRoute, /const status = parseRosterStatus\(body\.status\);/);
assert.match(rosterRoute, /Enrollment status is required\./);

console.log("capacity waitlist rules regression passed");
