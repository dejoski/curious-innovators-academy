-- Semester-bounded class catalog and calendar contract.
-- Existing classes are assigned to the default Fall 2026 semester so current data remains visible.

CREATE TABLE IF NOT EXISTS public.semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT semesters_name_unique UNIQUE (name),
  CONSTRAINT semesters_date_order CHECK (ends_on >= starts_on)
);

CREATE UNIQUE INDEX IF NOT EXISTS semesters_one_current_idx
  ON public.semesters (is_current)
  WHERE is_current;

INSERT INTO public.semesters (name, starts_on, ends_on, is_current)
VALUES
  ('Fall 2026', DATE '2026-09-08', DATE '2026-12-17', true),
  ('Spring 2027', DATE '2027-01-12', DATE '2027-05-20', false)
ON CONFLICT (name) DO UPDATE
SET
  starts_on = EXCLUDED.starts_on,
  ends_on = EXCLUDED.ends_on,
  is_current = EXCLUDED.is_current,
  updated_at = now();

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS semester_id uuid REFERENCES public.semesters (id) ON DELETE RESTRICT;

UPDATE public.classes
SET semester_id = (SELECT id FROM public.semesters WHERE name = 'Fall 2026')
WHERE semester_id IS NULL;

ALTER TABLE public.classes
  ALTER COLUMN semester_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS classes_semester_id_idx ON public.classes (semester_id);

ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS semesters_select_authenticated ON public.semesters;
CREATE POLICY semesters_select_authenticated
  ON public.semesters FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS semesters_write_admin ON public.semesters;
CREATE POLICY semesters_write_admin
  ON public.semesters FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());
