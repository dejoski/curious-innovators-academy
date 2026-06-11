CREATE TABLE IF NOT EXISTS public.student_competency_levels (
  student_id uuid NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  competency text NOT NULL,
  level text NOT NULL,
  behavior text NOT NULL DEFAULT 'core',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_competency_levels_pkey PRIMARY KEY (student_id, competency),
  CONSTRAINT student_competency_levels_behavior_check CHECK (behavior IN ('block', 'core', 'enrichment'))
);

CREATE INDEX IF NOT EXISTS student_competency_levels_student_idx
  ON public.student_competency_levels (student_id);

ALTER TABLE public.student_competency_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_competency_levels_select ON public.student_competency_levels;
CREATE POLICY student_competency_levels_select
  ON public.student_competency_levels FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.parent_can_see_student(student_competency_levels.student_id)
    OR private.student_is_self(student_competency_levels.student_id)
    OR private.teacher_teaches_student(student_competency_levels.student_id)
  );

DROP POLICY IF EXISTS student_competency_levels_write_admin ON public.student_competency_levels;
CREATE POLICY student_competency_levels_write_admin
  ON public.student_competency_levels FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());
