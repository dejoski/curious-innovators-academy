#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const REQUIRED_CORE_SLOTS = [
  "Block 1 Day 1",
  "Block 1 Day 2",
  "Block 1 Day 3",
  "Block 2 Day 1",
  "Block 2 Day 2",
  "Block 2 Day 3",
];

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const DRY_RUN = args.has("--dry-run") || !APPLY;

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function normalizeSlot(value) {
  const match = String(value ?? "").match(/\bBlock\s*([12])\s*Day\s*([123])\b/i);
  return match ? `Block ${match[1]} Day ${match[2]}` : "";
}

function normalizeStatus(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeLevel(value) {
  return String(value ?? "").trim().toLowerCase();
}

function byStableClassOrder(a, b) {
  return String(a.name ?? "").localeCompare(String(b.name ?? "")) || String(a.id).localeCompare(String(b.id));
}

function groupByStudent(students) {
  return new Map(students.map((student) => [
    String(student.id),
    {
      id: String(student.id),
      name: String(student.display_name ?? student.name ?? student.id),
      level: String(student.level ?? ""),
      enrollments: [],
    },
  ]));
}

function coreClassFromEnrollment(row) {
  const cls = Array.isArray(row.classes) ? row.classes[0] : row.classes;
  if (!cls || String(cls.program ?? "").toLowerCase() !== "core") return null;
  return {
    id: String(cls.id ?? row.class_id ?? ""),
    name: String(cls.name ?? ""),
    slot: normalizeSlot(cls.block),
    level: String(cls.level ?? ""),
    status: normalizeStatus(row.status),
  };
}

function chooseClassForSlot({ slot, classes, assignedClassIds, preferredLevels, enrollmentCounts }) {
  const exactActive = classes
    .filter((cls) => cls.slot === slot && cls.program === "core" && cls.status !== "inactive")
    .sort(byStableClassOrder);
  const exactAny = classes
    .filter((cls) => cls.slot === slot && cls.program === "core")
    .sort(byStableClassOrder);
  const pool = exactActive.length ? exactActive : exactAny;
  if (pool.length === 0) return null;

  const score = (cls) => {
    const level = normalizeLevel(cls.level);
    const preferredLevelScore = preferredLevels.size === 0 || preferredLevels.has(level) ? 0 : 1;
    const uniqueScore = assignedClassIds.has(cls.id) ? 1 : 0;
    const count = enrollmentCounts.get(cls.id) ?? 0;
    return [preferredLevelScore, uniqueScore, count, String(cls.name), String(cls.id)];
  };

  return [...pool].sort((a, b) => {
    const left = score(a);
    const right = score(b);
    for (let i = 0; i < left.length; i += 1) {
      if (typeof left[i] === "number" && typeof right[i] === "number") {
        if (left[i] !== right[i]) return left[i] - right[i];
      } else {
        const diff = String(left[i]).localeCompare(String(right[i]));
        if (diff) return diff;
      }
    }
    return 0;
  })[0];
}

function summarizePlan(students, planned, unfixable) {
  const missingStudents = new Set(planned.map((row) => row.studentId));
  unfixable.forEach((row) => missingStudents.add(row.studentId));
  return {
    totalStudentsChecked: students.length,
    studentsMissingCoreSlots: missingStudents.size,
    plannedInsertCount: planned.length,
    unfixableCount: unfixable.length,
  };
}

async function main() {
  const root = path.resolve(__dirname, "..");
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, ".env"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const [{ data: students, error: studentsError }, { data: classes, error: classesError }, { data: enrollments, error: enrollmentsError }] = await Promise.all([
    supabase.from("students").select("id, display_name, level").order("display_name", { ascending: true }),
    supabase.from("classes").select("id, name, program, block, level, status").eq("program", "core"),
    supabase.from("enrollments").select("id, student_id, class_id, status, classes ( id, name, program, block, level, status )"),
  ]);

  if (studentsError) throw studentsError;
  if (classesError) throw classesError;
  if (enrollmentsError) throw enrollmentsError;

  const byStudent = groupByStudent(students ?? []);
  const enrollmentCounts = new Map();
  for (const row of enrollments ?? []) {
    const classId = String(row.class_id ?? "");
    if (classId) enrollmentCounts.set(classId, (enrollmentCounts.get(classId) ?? 0) + 1);
    const student = byStudent.get(String(row.student_id ?? ""));
    const core = coreClassFromEnrollment(row);
    if (student && core && core.status === "approved") {
      student.enrollments.push(core);
    }
  }

  const coreClasses = (classes ?? []).map((cls) => ({
    id: String(cls.id ?? ""),
    name: String(cls.name ?? ""),
    program: String(cls.program ?? "").toLowerCase(),
    slot: normalizeSlot(cls.block),
    level: String(cls.level ?? ""),
    status: normalizeStatus(cls.status),
  })).filter((cls) => cls.id && cls.program === "core" && cls.slot);

  const planned = [];
  const unfixable = [];

  for (const student of byStudent.values()) {
    const slots = new Map(REQUIRED_CORE_SLOTS.map((slot) => [slot, []]));
    const assignedClassIds = new Set();
    const preferredLevels = new Set();
    for (const enrollment of student.enrollments) {
      assignedClassIds.add(enrollment.id);
      const level = normalizeLevel(enrollment.level);
      if (level) preferredLevels.add(level);
      if (slots.has(enrollment.slot)) {
        slots.get(enrollment.slot).push(enrollment);
      }
    }

    for (const slot of REQUIRED_CORE_SLOTS) {
      if ((slots.get(slot) ?? []).length > 0) continue;
      const cls = chooseClassForSlot({
        slot,
        classes: coreClasses,
        assignedClassIds,
        preferredLevels,
        enrollmentCounts,
      });
      if (!cls) {
        unfixable.push({
          studentId: student.id,
          student: student.name,
          slot,
          reason: "No core class candidate exists for this slot.",
        });
        continue;
      }
      planned.push({
        studentId: student.id,
        student: student.name,
        slot,
        classId: cls.id,
        class: cls.name,
        classLevel: cls.level,
      });
      assignedClassIds.add(cls.id);
      enrollmentCounts.set(cls.id, (enrollmentCounts.get(cls.id) ?? 0) + 1);
    }
  }

  const summary = summarizePlan(students ?? [], planned, unfixable);
  console.log(JSON.stringify({ mode: DRY_RUN ? "dry-run" : "apply", summary, planned, unfixable }, null, 2));

  if (unfixable.length > 0) {
    process.exitCode = 1;
    return;
  }

  if (!APPLY || planned.length === 0) return;

  const payload = planned.map((row) => ({
    student_id: row.studentId,
    class_id: row.classId,
    status: "approved",
  }));
  const { error: insertError } = await supabase.from("enrollments").insert(payload);
  if (insertError) throw insertError;
  console.log(JSON.stringify({ appliedInsertCount: payload.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
