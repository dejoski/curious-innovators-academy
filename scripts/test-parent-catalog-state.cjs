const assert = require("node:assert/strict");
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
  const source = require("node:fs").readFileSync(filename, "utf8");
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
  catalogChoiceReviews,
  catalogSnapshotFromEnrichmentRequests,
  localReviewKey,
  parentCatalogRequestsForChoice,
  parentCatalogRequestsForSlot,
  remainingParentCatalogDraftAfterSubmit,
  selectedChoicesForSubmit,
} = require("../src/lib/parent-catalog-state.ts");

const mariaId = "ba601e9a-3d15-4a57-aa14-35d6ac516245";

const snapshot = catalogSnapshotFromEnrichmentRequests(
  [
    {
      id: "pending-fashion",
      studentId: mariaId,
      classId: "fashion",
      student: "Maria Collins",
      parent: "Parent demo",
      class: "Fashion Design & Textile Arts",
      block: "Block 4 Day 2",
      level: "Fine Arts",
      option: "1st choice",
      status: "Pending",
    },
    {
      id: "pending-psychology",
      studentId: mariaId,
      classId: "psychology",
      student: "Maria Collins",
      parent: "Parent demo",
      class: "The Science of the Mind: Intro to Psychology",
      block: "Block 4 Day 2",
      level: "Social Studies & Humanities",
      option: "2nd choice",
      status: "Pending",
    },
    {
      id: "enrollment:rejected-cellular",
      studentId: mariaId,
      classId: "cellular",
      student: "Maria Collins",
      parent: "Parent demo",
      class: "Cellular Structures",
      block: "Block 4 Day 2",
      level: "Science",
      option: "Final placement",
      status: "Rejected",
    },
    {
      id: "enrollment:rejected-songwriting",
      studentId: mariaId,
      classId: "songwriting",
      student: "Maria Collins",
      parent: "Parent demo",
      class: "Singing & Songwriting",
      block: "Block 4 Day 1",
      level: "Performing Arts",
      option: "Final placement",
      status: "Rejected",
    },
  ],
  mariaId,
);

assert.equal(snapshot.state, "submitted");
assert.equal(snapshot.requests?.block4_day2.firstChoice?.name, "Fashion Design & Textile Arts");
assert.equal(snapshot.requests?.block4_day2.secondChoice?.name, "The Science of the Mind: Intro to Psychology");
assert.equal(snapshot.reviewStatuses[localReviewKey("block4_day2", "first")], "Pending");
assert.equal(snapshot.reviewStatuses[localReviewKey("block4_day2", "second")], "Pending");
assert.equal(snapshot.requests?.block4_day1.firstChoice?.name, "Singing & Songwriting");
assert.equal(snapshot.reviewStatuses[localReviewKey("block4_day1", "first")], "Rejected");

const reviews = catalogChoiceReviews(snapshot.requests, snapshot.reviewStatuses);
assert.deepEqual(
  reviews
    .filter((review) => review.slotId === "block4_day2")
    .map((review) => `${review.status}:${review.choice}:${review.name}`),
  [
    "Pending:1st:Fashion Design & Textile Arts",
    "Pending:2nd:The Science of the Mind: Intro to Psychology",
  ],
);

const twoChoiceDraft = {
  block3_day1: { firstChoice: null, secondChoice: null },
  block3_day2: { firstChoice: null, secondChoice: null },
  block3_day3: { firstChoice: null, secondChoice: null },
  block4_day1: {
    firstChoice: { id: "songwriting", name: "Singing & Songwriting" },
    secondChoice: { id: "podcast", name: "Podcast Studio" },
  },
  block4_day2: { firstChoice: null, secondChoice: null },
  block4_day3: { firstChoice: null, secondChoice: null },
};

const firstChoiceOnly = parentCatalogRequestsForChoice(twoChoiceDraft, "block4_day1", "firstChoice");
assert.deepEqual(selectedChoicesForSubmit(firstChoiceOnly), [
  { classId: "songwriting", block: "B4", level: "1", option: "1st" },
]);

const activeSlotChoices = parentCatalogRequestsForSlot(twoChoiceDraft, "block4_day1");
assert.deepEqual(
  selectedChoicesForSubmit(activeSlotChoices).map((choice) => `${choice.option}:${choice.classId}`),
  ["1st:songwriting", "2nd:podcast"],
);

const remainingAfterFirstSubmit = remainingParentCatalogDraftAfterSubmit(
  twoChoiceDraft,
  firstChoiceOnly,
  {
    ...twoChoiceDraft,
    block4_day1: {
      firstChoice: { id: "songwriting", name: "Singing & Songwriting" },
      secondChoice: null,
    },
  },
);
assert.deepEqual(selectedChoicesForSubmit(remainingAfterFirstSubmit), [
  { classId: "podcast", block: "B4", level: "1", option: "2nd" },
]);

console.log("parent catalog state regression passed");
