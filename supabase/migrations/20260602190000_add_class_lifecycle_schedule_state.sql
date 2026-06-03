-- Add SIS lifecycle and schedule-state fields without changing existing enum contracts.

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS room text,
  ADD COLUMN IF NOT EXISTS min_age_years integer,
  ADD COLUMN IF NOT EXISTS max_age_years integer,
  ADD COLUMN IF NOT EXISTS schedule_days text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.classes
SET room = COALESCE(NULLIF(room, ''), NULLIF(location, ''))
WHERE room IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'classes_age_range_order'
      AND conrelid = 'public.classes'::regclass
  ) THEN
    ALTER TABLE public.classes
      ADD CONSTRAINT classes_age_range_order
      CHECK (
        min_age_years IS NULL
        OR max_age_years IS NULL
        OR max_age_years >= min_age_years
      );
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS classes_active_archive_idx
  ON public.classes (is_active, archived_at);

CREATE INDEX IF NOT EXISTS classes_age_range_idx
  ON public.classes (min_age_years, max_age_years);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_schedule_state') THEN
    CREATE TYPE public.student_schedule_state AS ENUM ('draft', 'pending', 'finalized');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.student_schedule_states (
  student_id uuid NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  semester_id uuid NOT NULL REFERENCES public.semesters (id) ON DELETE CASCADE,
  state public.student_schedule_state NOT NULL DEFAULT 'draft',
  finalized_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  finalized_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, semester_id)
);

CREATE INDEX IF NOT EXISTS student_schedule_states_state_idx
  ON public.student_schedule_states (state);

ALTER TABLE public.student_schedule_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_schedule_states_select ON public.student_schedule_states;
CREATE POLICY student_schedule_states_select
  ON public.student_schedule_states FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.parent_can_see_student(student_id)
    OR private.student_is_self(student_id)
    OR private.teacher_teaches_student(student_id)
  );

DROP POLICY IF EXISTS student_schedule_states_write_admin ON public.student_schedule_states;
CREATE POLICY student_schedule_states_write_admin
  ON public.student_schedule_states FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE OR REPLACE FUNCTION private.assert_class_parent_selectable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
SET row_security = off
AS $$
DECLARE
  class_row record;
  student_age integer;
BEGIN
  SELECT id, name, program, is_active, archived_at, min_age_years, max_age_years
    INTO class_row
  FROM public.classes
  WHERE id = NEW.class_id;

  IF class_row.id IS NULL THEN
    RAISE EXCEPTION 'Selected class was not found.';
  END IF;

  IF class_row.program <> 'enrichment' THEN
    RAISE EXCEPTION 'Parent requests can only be created for enrichment classes.';
  END IF;

  IF NOT class_row.is_active OR class_row.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'Selected class is not currently available.';
  END IF;

  SELECT age_years INTO student_age
  FROM public.students
  WHERE id = NEW.student_id;

  IF class_row.min_age_years IS NOT NULL AND student_age IS NOT NULL AND student_age < class_row.min_age_years THEN
    RAISE EXCEPTION 'Student does not meet the minimum age for %.', class_row.name;
  END IF;

  IF class_row.max_age_years IS NOT NULL AND student_age IS NOT NULL AND student_age > class_row.max_age_years THEN
    RAISE EXCEPTION 'Student exceeds the maximum age for %.', class_row.name;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS class_requests_parent_selectable ON public.class_requests;
CREATE TRIGGER class_requests_parent_selectable
  BEFORE INSERT OR UPDATE OF student_id, class_id ON public.class_requests
  FOR EACH ROW
  EXECUTE FUNCTION private.assert_class_parent_selectable();
