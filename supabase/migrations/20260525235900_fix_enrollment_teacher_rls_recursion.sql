-- Break remaining recursive RLS loops for parent schedule and catalog reads.
-- Keep parent APIs RLS-scoped: parents still see only linked-student enrollments,
-- while admin views use service-role reads after server-side admin verification.

BEGIN;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION private.parent_can_see_student(p_student_id uuid)
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
    JOIN public.parent_students ps ON ps.parent_id = pa.id
    WHERE pa.profile_id = auth.uid()
      AND ps.student_id = p_student_id
  );
$$;

CREATE OR REPLACE FUNCTION private.teacher_owns_class(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.teachers t ON t.id = c.teacher_id
    WHERE c.id = p_class_id
      AND t.profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.parent_or_student_enrolled_in_class(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.class_id = p_class_id
      AND (
        private.parent_can_see_student(e.student_id)
        OR private.student_is_self(e.student_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.parent_or_student_has_teacher(p_teacher_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.enrollments e ON e.class_id = c.id
    WHERE c.teacher_id = p_teacher_id
      AND (
        private.parent_can_see_student(e.student_id)
        OR private.student_is_self(e.student_id)
      )
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.parent_can_see_student(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.teacher_owns_class(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.parent_or_student_enrolled_in_class(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.parent_or_student_has_teacher(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.parent_can_see_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.teacher_owns_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.parent_or_student_enrolled_in_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.parent_or_student_has_teacher(uuid) TO authenticated;

DROP POLICY IF EXISTS teachers_select ON public.teachers;
CREATE POLICY teachers_select
  ON public.teachers FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR profile_id = auth.uid()
    OR private.parent_or_student_has_teacher(teachers.id)
  );

DROP POLICY IF EXISTS enrollments_select ON public.enrollments;
CREATE POLICY enrollments_select
  ON public.enrollments FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.parent_can_see_student(enrollments.student_id)
    OR private.student_is_self(enrollments.student_id)
    OR private.teacher_owns_class(enrollments.class_id)
  );

DROP POLICY IF EXISTS class_requests_select ON public.class_requests;
CREATE POLICY class_requests_select
  ON public.class_requests FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR requested_by_profile_id = auth.uid()
    OR private.parent_can_see_student(class_requests.student_id)
    OR private.teacher_owns_class(class_requests.class_id)
  );

DROP POLICY IF EXISTS class_requests_update_admin_or_teacher ON public.class_requests;
CREATE POLICY class_requests_update_admin_or_teacher
  ON public.class_requests FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.teacher_owns_class(class_requests.class_id)
  )
  WITH CHECK (
    private.is_admin()
    OR private.teacher_owns_class(class_requests.class_id)
  );

DROP POLICY IF EXISTS schedule_events_select ON public.schedule_events;
CREATE POLICY schedule_events_select
  ON public.schedule_events FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR class_id IS NULL
    OR private.parent_or_student_enrolled_in_class(schedule_events.class_id)
    OR private.teacher_owns_class(schedule_events.class_id)
  );

COMMIT;
