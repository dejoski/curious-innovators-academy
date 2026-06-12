const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

const addClassForm = read("src/app/dashboard/classes/new/add-class-form.tsx");
const editClassPage = read("src/app/dashboard/classes/edit/[segment]/[id]/page.tsx");

assert.match(addClassForm, /SemesterRow/);
assert.match(addClassForm, /fetch\("\/api\/data\/semesters"\)/);
assert.match(addClassForm, /currentSemester\?: SemesterRow \| null/);
assert.match(addClassForm, /semesterId: semesterId \|\| undefined/);
assert.match(addClassForm, /requiredLabel\("Term"\)/);
assert.match(addClassForm, /Loading terms\.\.\./);

assert.match(editClassPage, /SemesterRow/);
assert.match(editClassPage, /fetch\("\/api\/data\/semesters"\)/);
assert.match(editClassPage, /setSemesterId\(found\.semesterId \?\? ""\)/);
assert.match(editClassPage, /semesterId: semesterId \|\| undefined/);
assert.match(editClassPage, /Term\s+<select/);
assert.match(editClassPage, /Loading terms\.\.\./);

console.log("class term selector regression passed");
