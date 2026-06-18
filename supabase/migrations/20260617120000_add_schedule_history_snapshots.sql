-- Immutable schedule/class history plus explicit teacher-conflict override records.

CREATE TABLE IF NOT EXISTS public.student_schedule_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  semester_id uuid REFERENCES public.semesters (id) ON DELETE SET NULL,
  source_action text NOT NULL,
  source_entity_type text NOT NULL,
  source_entity_id text NOT NULL DEFAULT '',
  snapshot jsonb NOT NULL,
  actor_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS student_schedule_snapshots_student_created_at_idx
  ON public.student_schedule_snapshots (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS student_schedule_snapshots_semester_created_at_idx
  ON public.student_schedule_snapshots (semester_id, created_at DESC);

CREATE INDEX IF NOT EXISTS student_schedule_snapshots_source_entity_idx
  ON public.student_schedule_snapshots (source_entity_type, source_entity_id);

CREATE TABLE IF NOT EXISTS public.class_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  source_action text NOT NULL,
  source_entity_id text NOT NULL DEFAULT '',
  snapshot jsonb NOT NULL,
  actor_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS class_snapshots_class_created_at_idx
  ON public.class_snapshots (class_id, created_at DESC);

CREATE INDEX IF NOT EXISTS class_snapshots_source_action_idx
  ON public.class_snapshots (source_action);

CREATE TABLE IF NOT EXISTS public.teacher_conflict_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  slot text NOT NULL,
  class_ids uuid[] NOT NULL DEFAULT '{}',
  reason text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  decided_by_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_conflict_overrides_min_classes_check
    CHECK (COALESCE(array_length(class_ids, 1), 0) >= 2)
);

CREATE INDEX IF NOT EXISTS teacher_conflict_overrides_teacher_slot_idx
  ON public.teacher_conflict_overrides (teacher_id, slot);

CREATE INDEX IF NOT EXISTS teacher_conflict_overrides_active_idx
  ON public.teacher_conflict_overrides (active);

CREATE INDEX IF NOT EXISTS teacher_conflict_overrides_created_at_idx
  ON public.teacher_conflict_overrides (created_at DESC);

ALTER TABLE public.student_schedule_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_conflict_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_schedule_snapshots_select_scoped ON public.student_schedule_snapshots;
CREATE POLICY student_schedule_snapshots_select_scoped
  ON public.student_schedule_snapshots FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.parent_can_see_student(student_id)
    OR private.student_is_self(student_id)
    OR private.teacher_teaches_student(student_id)
  );

DROP POLICY IF EXISTS student_schedule_snapshots_insert_admin ON public.student_schedule_snapshots;
CREATE POLICY student_schedule_snapshots_insert_admin
  ON public.student_schedule_snapshots FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS class_snapshots_select_admin ON public.class_snapshots;
CREATE POLICY class_snapshots_select_admin
  ON public.class_snapshots FOR SELECT TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS class_snapshots_insert_admin ON public.class_snapshots;
CREATE POLICY class_snapshots_insert_admin
  ON public.class_snapshots FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS teacher_conflict_overrides_select_admin ON public.teacher_conflict_overrides;
CREATE POLICY teacher_conflict_overrides_select_admin
  ON public.teacher_conflict_overrides FOR SELECT TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS teacher_conflict_overrides_insert_admin ON public.teacher_conflict_overrides;
CREATE POLICY teacher_conflict_overrides_insert_admin
  ON public.teacher_conflict_overrides FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS teacher_conflict_overrides_update_admin ON public.teacher_conflict_overrides;
CREATE POLICY teacher_conflict_overrides_update_admin
  ON public.teacher_conflict_overrides FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());
