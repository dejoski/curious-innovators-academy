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
  competencyBlockDisplayName,
  competencyMappingKey,
  normalizeCompetencyBlockMapping,
  scheduleSlotsForCompetencyBlock,
} = require("../src/lib/competency-block-mappings.ts");

assert.deepEqual(normalizeCompetencyBlockMapping({
  competency: "Reading",
  level: "  Group   D ",
  block_number: 2,
}), {
  competency: "reading",
  level: "Group D",
  blockNumber: 2,
  block: "Block 2",
  updatedAt: undefined,
});
assert.equal(normalizeCompetencyBlockMapping({ competency: "science", level: "A", block_number: 1 }), null);
assert.equal(competencyMappingKey("math", " C "), "math\u0000c");
assert.equal(competencyBlockDisplayName("reading", "D"), "Reading group D");
assert.deepEqual(scheduleSlotsForCompetencyBlock(1), ["b1Tue", "b1Wed", "b1Thu"]);
assert.deepEqual(scheduleSlotsForCompetencyBlock(4), ["b4Tue", "b4Wed", "b4Thu"]);

const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20260611200000_add_competency_block_mappings.sql"),
  "utf8",
);
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.competency_block_mappings/);
assert.match(migration, /CHECK \(competency IN \('reading', 'math'\)\)/);
assert.match(migration, /CHECK \(block_number BETWEEN 1 AND 4\)/);
assert.match(migration, /CREATE POLICY competency_block_mappings_write_admin/);

const route = fs.readFileSync(path.join(root, "src/app/api/data/competency-block-mappings/route.ts"), "utf8");
assert.match(route, /fetchAdminCompetencyBlockSettingsResolved/);
assert.match(route, /replaceCompetencyBlockMappings/);

const settings = fs.readFileSync(path.join(root, "src/app/dashboard/settings/page.tsx"), "utf8");
assert.match(settings, /Reading and Math blocks/);
assert.match(settings, /\/api\/data\/competency-block-mappings/);

const schedules = fs.readFileSync(path.join(root, "src/lib/data/repositories/student-details.ts"), "utf8");
assert.match(schedules, /applyCompetencyBlockPlaceholders/);
assert.match(schedules, /fetchCompetencyBlockMappingsForLevels/);
assert.match(schedules, /student_competency_levels \( competency, level, behavior \)/);

console.log("competency block mappings regression passed");
