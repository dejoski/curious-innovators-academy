#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function migrationSources() {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => read(path.join("supabase", "migrations", name)));
}

const source = migrationSources().join("\n\n");

function requireText(text, label) {
  if (!source.includes(text)) {
    failures.push(label);
  }
}

requireText("CREATE TABLE IF NOT EXISTS public.audit_events", "audit_events table missing");
requireText("ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY", "audit_events RLS missing");
requireText("CREATE POLICY audit_events_select_admin", "audit_events admin select policy missing");
requireText("CREATE POLICY audit_events_insert_actor", "audit_events actor insert policy missing");

requireText("CREATE TABLE IF NOT EXISTS public.class_request_decisions", "class_request_decisions table missing");
requireText("ALTER TABLE public.class_request_decisions ENABLE ROW LEVEL SECURITY", "class_request_decisions RLS missing");
requireText("CREATE POLICY class_request_decisions_select", "class_request_decisions select policy missing");
requireText("CREATE POLICY class_request_decisions_insert_admin_or_teacher", "class_request_decisions insert policy missing");

requireText("ALTER TABLE public.student_schedule_states ENABLE ROW LEVEL SECURITY", "student_schedule_states RLS missing");
requireText("CREATE POLICY student_schedule_states_select", "student_schedule_states select policy missing");
requireText("CREATE POLICY student_schedule_states_write_admin", "student_schedule_states write policy missing");

requireText("ALTER TABLE public.students ENABLE ROW LEVEL SECURITY", "students RLS missing");
requireText("CREATE POLICY students_select_scoped", "students select policy missing");
requireText("CREATE POLICY students_write_admin", "students write policy missing");

requireText("ALTER TABLE public.student_records ENABLE ROW LEVEL SECURITY", "student_records RLS missing");
requireText("CREATE POLICY student_records_select_scoped", "student_records select policy missing");
requireText("CREATE POLICY student_records_write_admin", "student_records write policy missing");

requireText("ALTER TABLE public.student_competency_levels ENABLE ROW LEVEL SECURITY", "student_competency_levels RLS missing");
requireText("CREATE POLICY student_competency_levels_select_scoped", "student_competency_levels select policy missing");
requireText("CREATE POLICY student_competency_levels_write_admin", "student_competency_levels write policy missing");

requireText("CREATE POLICY parents_select", "parents select policy missing");
requireText("CREATE POLICY parent_students_select", "parent_students select policy missing");
requireText("CREATE POLICY enrollments_select", "enrollments select policy missing");
requireText("CREATE POLICY class_requests_select", "class_requests select policy missing");
requireText("CREATE POLICY schedule_events_select", "schedule_events select policy missing");
requireText("CREATE TRIGGER class_requests_parent_selectable", "class_requests parent selectable trigger missing");

if (failures.length > 0) {
  console.error("SQL security check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("SQL security check passed.");
