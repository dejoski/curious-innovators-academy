-- Stop parent/parent_students SELECT policies from recursively reading each other.
-- Parent-facing API reads remain scoped to the signed-in parent; these helpers
-- only evaluate link ownership with row security disabled.

BEGIN;

CREATE OR REPLACE FUNCTION private.user_owns_parent(p_parent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parents pa
    WHERE pa.id = p_parent_id
      AND pa.profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.teacher_can_see_parent(p_parent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_students ps
    WHERE ps.parent_id = p_parent_id
      AND private.teacher_teaches_student(ps.student_id)
  );
$$;

REVOKE ALL ON FUNCTION private.user_owns_parent(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.teacher_can_see_parent(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.user_owns_parent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.teacher_can_see_parent(uuid) TO authenticated;

DROP POLICY IF EXISTS parents_select ON public.parents;
CREATE POLICY parents_select
  ON public.parents FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR profile_id = auth.uid()
    OR private.teacher_can_see_parent(parents.id)
  );

DROP POLICY IF EXISTS parent_students_select ON public.parent_students;
CREATE POLICY parent_students_select
  ON public.parent_students FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.user_owns_parent(parent_students.parent_id)
    OR private.parent_can_see_student(parent_students.student_id)
    OR private.teacher_teaches_student(parent_students.student_id)
  );

COMMIT;
