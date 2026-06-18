#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const migrationPath = path.join(
  root,
  "supabase/migrations/20260617120000_add_schedule_history_snapshots.sql",
);
const migration = fs.readFileSync(migrationPath, "utf8");
const migrationsDir = path.join(root, "supabase", "migrations");
const allMigrations = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .map((name) => fs.readFileSync(path.join(migrationsDir, name), "utf8"))
  .join("\n\n");

function requireMatch(pattern, label) {
  assert.match(migration, pattern, label);
}

function requireNoDeletePolicy(tableName) {
  const deleteOrAllPolicy = new RegExp(
    `CREATE\\s+POLICY[\\s\\S]*?ON\\s+public\\.${tableName}\\s+FOR\\s+(?:DELETE|ALL)\\b`,
    "i",
  );
  assert.doesNotMatch(
    allMigrations,
    deleteOrAllPolicy,
    `${tableName} must not define DELETE-capable policies`,
  );
}

requireMatch(/CREATE TABLE IF NOT EXISTS public\.student_schedule_snapshots/, "student schedule snapshots table missing");
requireMatch(/id uuid PRIMARY KEY DEFAULT gen_random_uuid\(\)/, "snapshot id column missing");
requireMatch(/student_id uuid NOT NULL REFERENCES public\.students \(id\) ON DELETE CASCADE/, "student snapshot student FK missing");
requireMatch(/semester_id uuid REFERENCES public\.semesters \(id\) ON DELETE SET NULL/, "student snapshot semester FK missing");
requireMatch(/source_action text NOT NULL/, "student snapshot source_action missing");
requireMatch(/source_entity_type text NOT NULL/, "student snapshot source_entity_type missing");
requireMatch(/source_entity_id text NOT NULL DEFAULT ''/, "student snapshot source_entity_id missing");
requireMatch(/snapshot jsonb NOT NULL/, "student snapshot json payload missing");
requireMatch(/actor_profile_id uuid REFERENCES public\.profiles \(id\) ON DELETE SET NULL/, "snapshot actor FK missing");
requireMatch(/student_schedule_snapshots_student_created_at_idx[\s\S]*\(student_id, created_at DESC\)/, "student snapshot student/created index missing");
requireMatch(/student_schedule_snapshots_semester_created_at_idx[\s\S]*\(semester_id, created_at DESC\)/, "student snapshot semester/created index missing");
requireMatch(/student_schedule_snapshots_source_entity_idx[\s\S]*\(source_entity_type, source_entity_id\)/, "student snapshot source entity index missing");
requireMatch(/ALTER TABLE public\.student_schedule_snapshots ENABLE ROW LEVEL SECURITY/, "student snapshot RLS missing");
requireMatch(/CREATE POLICY student_schedule_snapshots_select_scoped[\s\S]*FOR SELECT TO authenticated[\s\S]*private\.is_admin\(\)[\s\S]*private\.parent_can_see_student\(student_id\)[\s\S]*private\.student_is_self\(student_id\)[\s\S]*private\.teacher_teaches_student\(student_id\)/, "student snapshot scoped select policy missing");
requireMatch(/CREATE POLICY student_schedule_snapshots_insert_admin[\s\S]*FOR INSERT TO authenticated[\s\S]*WITH CHECK \(private\.is_admin\(\)\)/, "student snapshot admin insert policy missing");
requireNoDeletePolicy("student_schedule_snapshots");

requireMatch(/CREATE TABLE IF NOT EXISTS public\.class_snapshots/, "class snapshots table missing");
requireMatch(/class_id uuid NOT NULL REFERENCES public\.classes \(id\) ON DELETE CASCADE/, "class snapshot class FK missing");
requireMatch(/source_action text NOT NULL/, "class snapshot source_action missing");
requireMatch(/source_entity_id text NOT NULL DEFAULT ''/, "class snapshot source_entity_id missing");
requireMatch(/snapshot jsonb NOT NULL/, "class snapshot json payload missing");
requireMatch(/class_snapshots_class_created_at_idx[\s\S]*\(class_id, created_at DESC\)/, "class snapshot class/created index missing");
requireMatch(/class_snapshots_source_action_idx[\s\S]*\(source_action\)/, "class snapshot source_action index missing");
requireMatch(/ALTER TABLE public\.class_snapshots ENABLE ROW LEVEL SECURITY/, "class snapshot RLS missing");
requireMatch(/CREATE POLICY class_snapshots_select_admin[\s\S]*FOR SELECT TO authenticated[\s\S]*USING \(private\.is_admin\(\)\)/, "class snapshot admin select policy missing");
requireMatch(/CREATE POLICY class_snapshots_insert_admin[\s\S]*FOR INSERT TO authenticated[\s\S]*WITH CHECK \(private\.is_admin\(\)\)/, "class snapshot admin insert policy missing");
requireNoDeletePolicy("class_snapshots");

requireMatch(/CREATE TABLE IF NOT EXISTS public\.teacher_conflict_overrides/, "teacher conflict overrides table missing");
requireMatch(/teacher_id uuid NOT NULL REFERENCES public\.teachers \(id\) ON DELETE CASCADE/, "teacher override teacher FK missing");
requireMatch(/slot text NOT NULL/, "teacher override slot missing");
requireMatch(/class_ids uuid\[\] NOT NULL DEFAULT '\{\}'/, "teacher override class_ids missing");
requireMatch(/reason text NOT NULL DEFAULT ''/, "teacher override reason missing");
requireMatch(/active boolean NOT NULL DEFAULT true/, "teacher override active missing");
requireMatch(/decided_by_profile_id uuid REFERENCES public\.profiles \(id\) ON DELETE SET NULL/, "teacher override decided_by FK missing");
requireMatch(/CHECK \(COALESCE\(array_length\(class_ids, 1\), 0\) >= 2\)/, "teacher override class_ids minimum check missing");
requireMatch(/teacher_conflict_overrides_teacher_slot_idx[\s\S]*\(teacher_id, slot\)/, "teacher override teacher/slot index missing");
requireMatch(/teacher_conflict_overrides_active_idx[\s\S]*\(active\)/, "teacher override active index missing");
requireMatch(/teacher_conflict_overrides_created_at_idx[\s\S]*\(created_at DESC\)/, "teacher override created index missing");
requireMatch(/ALTER TABLE public\.teacher_conflict_overrides ENABLE ROW LEVEL SECURITY/, "teacher override RLS missing");
requireMatch(/CREATE POLICY teacher_conflict_overrides_select_admin[\s\S]*FOR SELECT TO authenticated[\s\S]*USING \(private\.is_admin\(\)\)/, "teacher override admin select policy missing");
requireMatch(/CREATE POLICY teacher_conflict_overrides_insert_admin[\s\S]*FOR INSERT TO authenticated[\s\S]*WITH CHECK \(private\.is_admin\(\)\)/, "teacher override admin insert policy missing");
requireMatch(/CREATE POLICY teacher_conflict_overrides_update_admin[\s\S]*FOR UPDATE TO authenticated[\s\S]*USING \(private\.is_admin\(\)\)[\s\S]*WITH CHECK \(private\.is_admin\(\)\)/, "teacher override admin update policy missing");
requireNoDeletePolicy("teacher_conflict_overrides");

console.log("schedule history schema regression passed");
