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
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const {
  DAILY_SCHEDULE_KEYS,
  applyTeacherConflictDiagnostics,
} = require("../src/lib/data/repositories/schedule-diagnostics.ts");

function emptyRow(id) {
  const row = {
    id,
    name: `Student ${id}`,
    parent: "Parent",
    avatar: "/avatar.png",
    scheduleState: "draft",
    hasConflicts: false,
    incompleteBlocks: 12,
    conflicts: [],
    b1: [],
    b2: [],
  };
  for (const key of DAILY_SCHEDULE_KEYS) {
    row[key] = [];
  }
  return row;
}

function placement(classId, label, tone = "approved") {
  return {
    label,
    tone,
    classId,
    teacherId: "teacher-1",
    teacher: "Ada Lovelace",
  };
}

const sameClassA = emptyRow("same-a");
const sameClassB = emptyRow("same-b");
sameClassA.b3Tue.push(placement("class-a", "Robotics A"));
sameClassB.b3Tue.push(placement("class-a", "Robotics A"));
applyTeacherConflictDiagnostics([sameClassA, sameClassB]);
assert.equal(sameClassA.hasConflicts, false);
assert.deepEqual(sameClassA.conflicts, []);
assert.equal(sameClassB.hasConflicts, false);
assert.deepEqual(sameClassB.conflicts, []);

const confirmedA = emptyRow("confirmed-a");
const confirmedB = emptyRow("confirmed-b");
const pending = emptyRow("pending");
confirmedA.b3Tue.push(placement("class-a", "Robotics A", "core"));
confirmedB.b3Tue.push(placement("class-b", "Robotics B", "approved"));
pending.b3Tue.push(placement("class-c", "Robotics C", "pending"));

applyTeacherConflictDiagnostics([confirmedA, confirmedB, pending]);

assert.equal(confirmedA.hasConflicts, true);
assert.equal(confirmedB.hasConflicts, true);
assert.equal(pending.hasConflicts, false);

assert.equal(confirmedA.conflicts.length, 1);
assert.equal(confirmedA.conflicts[0].kind, "teacher");
assert.equal(confirmedA.conflicts[0].label, "Teacher conflict");
assert.equal(confirmedA.conflicts[0].classId, "class-a");
assert.equal(confirmedA.conflicts[0].className, "Robotics A");
assert.equal(confirmedA.conflicts[0].teacherId, "teacher-1");
assert.equal(confirmedA.conflicts[0].teacher, "Ada Lovelace");
assert.match(confirmedA.conflicts[0].detail, /multiple confirmed class placements/);
assert.match(confirmedA.conflicts[0].detail, /Block 3 Day 1/);

assert.equal(confirmedB.conflicts.length, 1);
assert.equal(confirmedB.conflicts[0].classId, "class-b");
assert.deepEqual(pending.conflicts, []);

applyTeacherConflictDiagnostics([confirmedA, confirmedB, pending]);
assert.equal(confirmedA.conflicts.length, 1);
assert.equal(confirmedB.conflicts.length, 1);

const overrideA = emptyRow("override-a");
const overrideB = emptyRow("override-b");
overrideA.b2Wed.push(placement("class-a", "Robotics A"));
overrideB.b2Wed.push(placement("class-b", "Robotics B"));
applyTeacherConflictDiagnostics([overrideA, overrideB], [{
  id: "override-1",
  teacherId: "teacher-1",
  slot: "b2Wed",
  classIds: ["class-a", "class-b"],
}]);
assert.equal(overrideA.hasConflicts, true);
assert.equal(overrideA.conflicts[0].kind, "teacher");
assert.equal(overrideA.conflicts[0].overrideId, "override-1");
assert.equal(overrideA.conflicts[0].overrideRecorded, true);
assert.equal(overrideB.conflicts[0].overrideId, "override-1");
assert.equal(overrideB.conflicts[0].overrideRecorded, true);

const studentDetails = fs.readFileSync(
  path.join(root, "src/lib/data/repositories/student-details.ts"),
  "utf8",
);
assert.match(studentDetails, /applyTeacherConflictDiagnostics\(rows,\s*activeTeacherOverrides\)/);
assert.match(studentDetails, /applyTeacherConflictDiagnostics\(\[row\],\s*activeTeacherOverrides\)/);
assert.match(studentDetails, /fetchActiveTeacherConflictOverrides/);
assert.match(studentDetails, /\.from\("teacher_conflict_overrides"\)/);
assert.match(studentDetails, /conflict\.kind !== "teacher" \|\| !conflict\.overrideRecorded/);
assert.match(studentDetails, /recordTeacherScheduleConflictOverrideResolved/);
assert.match(studentDetails, /action:\s*"schedule_conflict\.override"/);
assert.match(studentDetails, /sourceAction:\s*"schedule_conflict\.override"/);

console.log("schedule diagnostics regression passed");
