#!/usr/bin/env node
/*
 * Rejects bundled placeholder rows and production-hostile placeholders. App pages and
 * shared UI should call repositories/API routes backed by Supabase.
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const scanRoots = ["src/app", "src/components", "src/lib"];
const allowedDemoAccountImports = new Set([
  path.join("src", "components", "dashboard-persona.tsx"),
  path.join("src", "components", "settings-qa-tools.tsx"),
  path.join("src", "lib", "demo-accounts.ts"),
  path.join("src", "lib", "demo-session-bootstrap.ts"),
]);
const violations = [];
const forbiddenInlineSampleLiterals = [
  "Anna Lee",
  "George Lee",
  "Bruna Lee",
  "Bruce Collins",
  "Maria Collins",
  "Mary Lee",
  "Joseph Collins",
  "Emily Carter",
  "Robotics Lab",
  "Journalism & Media Writing",
  "Ocean Explorers",
  "Youth Entrepreneurship",
  "Economics & Financial Literacy",
  "Health Sciences Lab",
  "Creative Writing & Storytelling",
  "Math 101",
  "Science 101",
  "Block 2 at capacity",
];
const forbiddenLocalOnlyActionText = [
  "locally only",
  "local edit only",
  "local-only",
  "Kept local",
  "Marked locally",
  "Duplicated locally",
  "Status kept locally",
];
const forbiddenProductionCopy = [
  "Figma:",
  "Teacher TBD",
  "Block TBD",
  "Schedule TBD",
  "Time TBD",
  "Room TBD",
  "Photo uploads aren’t connected",
  "Photo uploads aren't connected",
  "local preview row",
  "offline preview row",
  "Figma-aligned",
  "Figma-derived",
  "Showing bundled development",
  "Showing demo billing rows",
  "Showing local sample",
  "Production submissions require Supabase",
  "offline schedule template",
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

for (const scanRoot of scanRoots) {
  for (const file of walk(path.join(root, scanRoot))) {
    const rel = path.relative(root, file);
    const content = fs.readFileSync(file, "utf8");
    const importsMockData = content.includes("@/lib/data/mock") || content.includes("../lib/data/mock");
    if (importsMockData) {
      violations.push(`${rel}: imports bundled mock data; repositories must return remote or unavailable data`);
    }
    const importsDemoAccounts =
      content.includes("@/lib/demo-accounts") ||
      content.includes("../lib/demo-accounts") ||
      content.includes("../../lib/demo-accounts");
    if (importsDemoAccounts && !allowedDemoAccountImports.has(rel)) {
      violations.push(`${rel}: imports demo account data outside the QA/persona boundary`);
    }
    if (rel.startsWith(path.join("src", "app") + path.sep) && content.includes("DEMO_ACCOUNTS")) {
      violations.push(`${rel}: app route references DEMO_ACCOUNTS directly; keep demo account lists in QA-only components`);
    }
    if (content.includes("parent-student-profile-demo")) {
      violations.push(`${rel}: imports removed parent student demo helper`);
    }
    if (content.includes("@/lib/supabase/rest") || content.includes("supabase/rest")) {
      violations.push(`${rel}: imports removed anon-key REST helper; use the cookie-aware server Supabase client`);
    }
    if (content.includes("window.alert") || /\balert\s*\(/.test(content)) {
      violations.push(`${rel}: uses blocking browser alerts; use inline app status or a modal instead`);
    }
    if (content.includes("window.confirm")) {
      violations.push(`${rel}: uses blocking browser confirmations; use an app modal instead`);
    }
    for (const literal of forbiddenInlineSampleLiterals) {
      if (content.includes(literal)) {
        violations.push(`${rel}: hardcodes sample literal "${literal}" outside the data layer`);
      }
    }
    for (const literal of forbiddenLocalOnlyActionText) {
      if (content.includes(literal)) {
        violations.push(`${rel}: exposes local-only action text "${literal}"; production actions must persist or fail visibly`);
      }
    }
    if (rel.startsWith(path.join("src", "app") + path.sep) || rel.startsWith(path.join("src", "components") + path.sep) || rel === path.join("src", "lib", "product-copy.ts")) {
      for (const literal of forbiddenProductionCopy) {
        if (content.includes(literal)) {
          violations.push(`${rel}: exposes production-hostile copy "${literal}"`);
        }
      }
    }
  }
}

if (fs.existsSync(path.join(root, "src/lib/parent-student-profile-demo.ts"))) {
  violations.push("src/lib/parent-student-profile-demo.ts: deleted helper has been recreated");
}

if (fs.existsSync(path.join(root, "src/lib/supabase/rest.ts"))) {
  violations.push("src/lib/supabase/rest.ts: anon-key REST helper has been recreated");
}

if (fs.existsSync(path.join(root, "src/lib/data/mock"))) {
  violations.push("src/lib/data/mock: bundled placeholder data directory has been recreated");
}

if (fs.existsSync(path.join(root, "src/app/dashboard/alt/page.tsx"))) {
  violations.push("src/app/dashboard/alt/page.tsx: deleted alternate scaffold dashboard route has been recreated");
}

if (fs.existsSync(path.join(root, "src/app/dashboard/classes/check/page.tsx"))) {
  violations.push("src/app/dashboard/classes/check/page.tsx: deleted QA check route has been recreated");
}

if (fs.existsSync(path.join(root, "src/app/dashboard/students/[id]/schedule/alt/page.tsx"))) {
  violations.push("src/app/dashboard/students/[id]/schedule/alt/page.tsx: deleted offline-only alternate schedule route has been recreated");
}

const serverWrites = fs.readFileSync(path.join(root, "src/lib/data/server-writes.ts"), "utf8");
if (!/serverInsertStudent[\s\S]*support_notes:\s*input\.notes\?/.test(serverWrites)) {
  violations.push("src/lib/data/server-writes.ts: serverInsertStudent must persist Add Student notes to students.support_notes");
}

const studentRepository = fs.readFileSync(path.join(root, "src/lib/data/repositories/students.ts"), "utf8");
if (!studentRepository.includes("row.support_notes")) {
  violations.push("src/lib/data/repositories/students.ts: student mapper must read persisted support_notes");
}
const studentSelectConstantIncludesSupportNotes =
  /const\s+STUDENT_SELECT\s*=[\s\S]*support_notes/.test(studentRepository);
const studentReadsUseSelectConstant =
  (studentRepository.match(/\.select\(STUDENT_SELECT\)/g) ?? []).length >= 2;
const studentInlineReadsIncludeSupportNotes =
  (studentRepository.match(/profile_id, support_notes/g) ?? []).length >= 2;
if (
  !studentInlineReadsIncludeSupportNotes &&
  !(studentSelectConstantIncludesSupportNotes && studentReadsUseSelectConstant)
) {
  violations.push("src/lib/data/repositories/students.ts: student Supabase selects must include support_notes for list and detail reads");
}

const addStudentPage = fs.readFileSync(path.join(root, "src/app/dashboard/students/new/page.tsx"), "utf8");
if (addStudentPage.includes('useState("New enrollment")')) {
  violations.push("src/app/dashboard/students/new/page.tsx: Add Student notes must start blank, not as placeholder data");
}
if (addStudentPage.includes('parent.trim() || "TBD"') || addStudentPage.includes('notes.trim() || "New enrollment"')) {
  violations.push("src/app/dashboard/students/new/page.tsx: Add Student must not submit placeholder parent or note values");
}

const createTeacherPage = fs.readFileSync(path.join(root, "src/app/dashboard/teachers/new/page.tsx"), "utf8");
if (createTeacherPage.includes("pending@school.edu") || createTeacherPage.includes('subjects.trim() || "TBD"')) {
  violations.push("src/app/dashboard/teachers/new/page.tsx: Create Teacher must not submit placeholder email or subject values");
}

const addClassPage = fs.readFileSync(path.join(root, "src/app/dashboard/classes/new/add-class-form.tsx"), "utf8");
if (
  addClassPage.includes('teacher.trim() || "TBD"') ||
  addClassPage.includes('scheduleText.trim() || "TBD"') ||
  addClassPage.includes('students.trim() || "0/1"')
) {
  violations.push("src/app/dashboard/classes/new/add-class-form.tsx: Add Class must not submit placeholder teacher, seat, or schedule values");
}

const editClassPage = fs.readFileSync(path.join(root, "src/app/dashboard/classes/edit/[segment]/[id]/page.tsx"), "utf8");
if (
  editClassPage.includes('draft.teacher.trim() || "TBD"') ||
  editClassPage.includes('draft.schedule.trim() || "TBD"') ||
  editClassPage.includes('draft.students.trim() || "0/1"')
) {
  violations.push("src/app/dashboard/classes/edit/[segment]/[id]/page.tsx: Edit Class must not submit placeholder teacher, seat, or schedule values");
}

const classRepository = fs.readFileSync(path.join(root, "src/lib/data/repositories/classes.ts"), "utf8");
const classAvailabilityMigration = fs.readFileSync(
  path.join(root, "supabase/migrations/20260525010500_class_catalog_availability_view.sql"),
  "utf8",
);
if (!classRepository.includes("class_catalog_availability")) {
  violations.push("src/lib/data/repositories/classes.ts: class list reads must use the database-owned class_catalog_availability view");
}
if (!/CREATE\s+OR\s+REPLACE\s+VIEW\s+public\.class_catalog_availability/i.test(classAvailabilityMigration)) {
  violations.push("supabase/migrations/20260525010500_class_catalog_availability_view.sql: missing class_catalog_availability view");
}

if (serverWrites.includes('(555) 000-0000')) {
  violations.push("src/lib/data/server-writes.ts: teacher writes must store blank optional phone values, not fake phone numbers");
}

if (violations.length) {
  console.error("FAIL: data-layer boundary violations:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("check-data-boundaries: OK (no bundled placeholder rows or direct mock-data imports in scanned runtime code)");
