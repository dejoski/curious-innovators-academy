-- Protect student records and student history tables with explicit RLS.
-- Reads stay scoped to admins, linked parents, self, and teachers.

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS students_select_scoped ON public.students;
CREATE POLICY students_select_scoped
  ON public.students FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.parent_can_see_student(id)
    OR private.student_is_self(id)
    OR private.teacher_teaches_student(id)
  );

DROP POLICY IF EXISTS students_write_admin ON public.students;
CREATE POLICY students_write_admin
  ON public.students FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

ALTER TABLE public.student_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_records_select_scoped ON public.student_records;
CREATE POLICY student_records_select_scoped
  ON public.student_records FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.parent_can_see_student(student_id)
    OR private.student_is_self(student_id)
    OR private.teacher_teaches_student(student_id)
  );

DROP POLICY IF EXISTS student_records_write_admin ON public.student_records;
CREATE POLICY student_records_write_admin
  ON public.student_records FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

ALTER TABLE public.student_competency_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_competency_levels_select_scoped ON public.student_competency_levels;
CREATE POLICY student_competency_levels_select_scoped
  ON public.student_competency_levels FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.parent_can_see_student(student_id)
    OR private.student_is_self(student_id)
    OR private.teacher_teaches_student(student_id)
  );

DROP POLICY IF EXISTS student_competency_levels_write_admin ON public.student_competency_levels;
CREATE POLICY student_competency_levels_write_admin
  ON public.student_competency_levels FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());
