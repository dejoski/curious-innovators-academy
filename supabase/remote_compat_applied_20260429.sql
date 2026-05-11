-- CIA compatibility migration (non-destructive) — extends existing public.profiles,
-- adds Track-2 domain tables, private helpers, RLS using profiles.role only.
-- Does NOT drop legacy tables (pets, etc.) or the profiles.name column.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'parent', 'student', 'teacher');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_status') THEN
    CREATE TYPE public.workflow_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'program_track') THEN
    CREATE TYPE public.program_track AS ENUM ('core', 'enrichment');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'class_status') THEN
    CREATE TYPE public.class_status AS ENUM ('active', 'full');
  END IF;
END$$;

CREATE SCHEMA IF NOT EXISTS private;

-- profiles: add role + display_name (keep existing name); must run before functions that reference role
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.app_role;
UPDATE public.profiles SET role = 'parent'::public.app_role WHERE role IS NULL;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'parent'::public.app_role;
ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
UPDATE public.profiles
SET display_name = COALESCE(
  NULLIF(trim(display_name), ''),
  NULLIF(trim(name), ''),
  NULLIF(trim(email), ''),
  split_part(email, '@', 1),
  'User'
)
WHERE display_name IS NULL OR trim(display_name) = '';
ALTER TABLE public.profiles ALTER COLUMN display_name SET NOT NULL;

UPDATE public.profiles
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;
ALTER TABLE public.profiles ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.profiles ALTER COLUMN updated_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_idx ON public.profiles (lower(email));
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (lower(email));

CREATE TABLE IF NOT EXISTS public.parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parents_profile_unique UNIQUE (profile_id)
);

CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  subjects text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  program public.program_track NOT NULL DEFAULT 'core',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teachers_profile_unique UNIQUE (profile_id)
);

CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE REFERENCES public.profiles (id) ON DELETE SET NULL,
  display_name text NOT NULL,
  guardian_label text,
  age_years integer,
  level text,
  track public.program_track NOT NULL DEFAULT 'core',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS students_profile_id_idx ON public.students (profile_id);

CREATE TABLE IF NOT EXISTS public.parent_students (
  parent_id uuid NOT NULL REFERENCES public.parents (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS parent_students_student_id_idx ON public.parent_students (student_id);

CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  teacher_id uuid NOT NULL REFERENCES public.teachers (id) ON DELETE RESTRICT,
  program public.program_track NOT NULL DEFAULT 'core',
  capacity integer NOT NULL DEFAULT 30,
  schedule_summary text NOT NULL DEFAULT '',
  status public.class_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS classes_teacher_id_idx ON public.classes (teacher_id);

CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  status public.workflow_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT enrollments_class_student_uniq UNIQUE (class_id, student_id)
);

CREATE INDEX IF NOT EXISTS enrollments_student_id_idx ON public.enrollments (student_id);
CREATE INDEX IF NOT EXISTS enrollments_class_id_idx ON public.enrollments (class_id);

CREATE TABLE IF NOT EXISTS public.class_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  requested_by_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status public.workflow_status NOT NULL DEFAULT 'pending',
  block text,
  level text,
  option_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS class_requests_student_idx ON public.class_requests (student_id);
CREATE INDEX IF NOT EXISTS class_requests_class_idx ON public.class_requests (class_id);

CREATE TABLE IF NOT EXISTS public.schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES public.classes (id) ON DELETE SET NULL,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  location text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS schedule_events_class_idx ON public.schedule_events (class_id);
CREATE INDEX IF NOT EXISTS schedule_events_starts_at_idx ON public.schedule_events (starts_at);

CREATE TABLE IF NOT EXISTS public.student_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  author_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS student_records_student_idx ON public.student_records (student_id);

CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  author_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes (id) ON DELETE SET NULL,
  body text NOT NULL,
  rating smallint CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_student_idx ON public.feedback (student_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  href text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON public.notifications (recipient_profile_id);

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
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
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parents pa
    JOIN public.parent_students ps ON ps.parent_id = pa.id
    WHERE pa.profile_id = auth.uid()
      AND ps.student_id = p_student_id
  );
$$;

CREATE OR REPLACE FUNCTION private.teacher_teaches_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.classes c ON c.id = e.class_id
    JOIN public.teachers t ON t.id = c.teacher_id
    WHERE e.student_id = p_student_id
      AND t.profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.student_is_self(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = p_student_id AND s.profile_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.parent_can_see_student(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.teacher_teaches_student(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.student_is_self(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.parent_can_see_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.teacher_teaches_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.student_is_self(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name, email, name)
  VALUES (
    NEW.id,
    'parent'::public.app_role,
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    NEW.raw_user_meta_data->>'name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.profiles_guard_role_and_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_adm boolean;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') INTO is_adm;

  IF OLD.role IS DISTINCT FROM NEW.role AND NOT is_adm THEN
    RAISE EXCEPTION 'insufficient privilege to change role';
  END IF;

  IF OLD.email IS DISTINCT FROM NEW.email AND NOT is_adm THEN
    RAISE EXCEPTION 'insufficient privilege to change email';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_trg ON public.profiles;
CREATE TRIGGER profiles_guard_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_role_and_email();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Replace legacy permissive profile policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self_or_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;

CREATE POLICY profiles_select
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR private.is_admin());

CREATE POLICY profiles_insert_own
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_self_or_admin
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR private.is_admin())
  WITH CHECK (id = auth.uid() OR private.is_admin());

-- Idempotent policy refresh on new tables
DROP POLICY IF EXISTS parents_select ON public.parents;
DROP POLICY IF EXISTS parents_insert_admin ON public.parents;
DROP POLICY IF EXISTS parents_update_admin ON public.parents;
DROP POLICY IF EXISTS parents_delete_admin ON public.parents;

CREATE POLICY parents_select
  ON public.parents FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.parent_students ps
      JOIN public.students s ON s.id = ps.student_id
      WHERE ps.parent_id = parents.id
        AND private.teacher_teaches_student(s.id)
    )
  );

CREATE POLICY parents_insert_admin
  ON public.parents FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

CREATE POLICY parents_update_admin
  ON public.parents FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY parents_delete_admin
  ON public.parents FOR DELETE TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS teachers_select ON public.teachers;
DROP POLICY IF EXISTS teachers_insert_admin ON public.teachers;
DROP POLICY IF EXISTS teachers_update_admin_or_self ON public.teachers;
DROP POLICY IF EXISTS teachers_delete_admin ON public.teachers;

CREATE POLICY teachers_select
  ON public.teachers FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.enrollments e ON e.class_id = c.id
      WHERE c.teacher_id = teachers.id
        AND (
          private.parent_can_see_student(e.student_id)
          OR private.student_is_self(e.student_id)
        )
    )
  );

CREATE POLICY teachers_insert_admin
  ON public.teachers FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

CREATE POLICY teachers_update_admin_or_self
  ON public.teachers FOR UPDATE TO authenticated
  USING (private.is_admin() OR profile_id = auth.uid())
  WITH CHECK (private.is_admin() OR profile_id = auth.uid());

CREATE POLICY teachers_delete_admin
  ON public.teachers FOR DELETE TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS students_select ON public.students;
DROP POLICY IF EXISTS students_insert_admin ON public.students;
DROP POLICY IF EXISTS students_update_admin ON public.students;
DROP POLICY IF EXISTS students_delete_admin ON public.students;

CREATE POLICY students_select
  ON public.students FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.student_is_self(students.id)
    OR private.parent_can_see_student(students.id)
    OR private.teacher_teaches_student(students.id)
  );

CREATE POLICY students_insert_admin
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

CREATE POLICY students_update_admin
  ON public.students FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY students_delete_admin
  ON public.students FOR DELETE TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS parent_students_select ON public.parent_students;
DROP POLICY IF EXISTS parent_students_write_admin ON public.parent_students;

CREATE POLICY parent_students_select
  ON public.parent_students FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR EXISTS (SELECT 1 FROM public.parents pa WHERE pa.id = parent_students.parent_id AND pa.profile_id = auth.uid())
    OR private.parent_can_see_student(parent_students.student_id)
    OR private.teacher_teaches_student(parent_students.student_id)
  );

CREATE POLICY parent_students_write_admin
  ON public.parent_students FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS classes_select ON public.classes;
DROP POLICY IF EXISTS classes_write_admin ON public.classes;

CREATE POLICY classes_select
  ON public.classes FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('parent', 'student')
    )
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = classes.teacher_id AND t.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.class_id = classes.id
        AND (
          private.parent_can_see_student(e.student_id)
          OR private.student_is_self(e.student_id)
        )
    )
  );

CREATE POLICY classes_write_admin
  ON public.classes FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS enrollments_select ON public.enrollments;
DROP POLICY IF EXISTS enrollments_write_admin ON public.enrollments;

CREATE POLICY enrollments_select
  ON public.enrollments FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.parent_can_see_student(enrollments.student_id)
    OR private.student_is_self(enrollments.student_id)
    OR EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.teachers t ON t.id = c.teacher_id
      WHERE c.id = enrollments.class_id AND t.profile_id = auth.uid()
    )
  );

CREATE POLICY enrollments_write_admin
  ON public.enrollments FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS class_requests_select ON public.class_requests;
DROP POLICY IF EXISTS class_requests_insert_parent_or_admin ON public.class_requests;
DROP POLICY IF EXISTS class_requests_update_admin_or_teacher ON public.class_requests;
DROP POLICY IF EXISTS class_requests_delete_admin ON public.class_requests;

CREATE POLICY class_requests_select
  ON public.class_requests FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR requested_by_profile_id = auth.uid()
    OR private.parent_can_see_student(class_requests.student_id)
    OR EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.teachers t ON t.id = c.teacher_id
      WHERE c.id = class_requests.class_id AND t.profile_id = auth.uid()
    )
  );

CREATE POLICY class_requests_insert_parent_or_admin
  ON public.class_requests FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR (
      requested_by_profile_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'parent')
      AND private.parent_can_see_student(student_id)
    )
  );

CREATE POLICY class_requests_update_admin_or_teacher
  ON public.class_requests FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.teachers t ON t.id = c.teacher_id
      WHERE c.id = class_requests.class_id AND t.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    private.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.teachers t ON t.id = c.teacher_id
      WHERE c.id = class_requests.class_id AND t.profile_id = auth.uid()
    )
  );

CREATE POLICY class_requests_delete_admin
  ON public.class_requests FOR DELETE TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS schedule_events_select ON public.schedule_events;
DROP POLICY IF EXISTS schedule_events_write_admin ON public.schedule_events;

CREATE POLICY schedule_events_select
  ON public.schedule_events FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR class_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.class_id = schedule_events.class_id
        AND (
          private.parent_can_see_student(e.student_id)
          OR private.student_is_self(e.student_id)
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.teachers t ON t.id = c.teacher_id
      WHERE c.id = schedule_events.class_id AND t.profile_id = auth.uid()
    )
  );

CREATE POLICY schedule_events_write_admin
  ON public.schedule_events FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS student_records_select ON public.student_records;
DROP POLICY IF EXISTS student_records_insert_teacher_or_admin ON public.student_records;
DROP POLICY IF EXISTS student_records_update_author_or_admin ON public.student_records;
DROP POLICY IF EXISTS student_records_delete_admin ON public.student_records;

CREATE POLICY student_records_select
  ON public.student_records FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR author_profile_id = auth.uid()
    OR private.parent_can_see_student(student_records.student_id)
    OR private.teacher_teaches_student(student_records.student_id)
  );

CREATE POLICY student_records_insert_teacher_or_admin
  ON public.student_records FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher')
      AND author_profile_id = auth.uid()
      AND private.teacher_teaches_student(student_id)
    )
  );

CREATE POLICY student_records_update_author_or_admin
  ON public.student_records FOR UPDATE TO authenticated
  USING (private.is_admin() OR author_profile_id = auth.uid())
  WITH CHECK (private.is_admin() OR author_profile_id = auth.uid());

CREATE POLICY student_records_delete_admin
  ON public.student_records FOR DELETE TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS feedback_select ON public.feedback;
DROP POLICY IF EXISTS feedback_insert_authenticated_context ON public.feedback;
DROP POLICY IF EXISTS feedback_update_author_or_admin ON public.feedback;
DROP POLICY IF EXISTS feedback_delete_admin ON public.feedback;

CREATE POLICY feedback_select
  ON public.feedback FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR author_profile_id = auth.uid()
    OR private.parent_can_see_student(feedback.student_id)
    OR private.teacher_teaches_student(feedback.student_id)
  );

CREATE POLICY feedback_insert_authenticated_context
  ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR (
      author_profile_id = auth.uid()
      AND (
        private.parent_can_see_student(student_id)
        OR private.student_is_self(student_id)
        OR private.teacher_teaches_student(student_id)
      )
    )
  );

CREATE POLICY feedback_update_author_or_admin
  ON public.feedback FOR UPDATE TO authenticated
  USING (private.is_admin() OR author_profile_id = auth.uid())
  WITH CHECK (private.is_admin() OR author_profile_id = auth.uid());

CREATE POLICY feedback_delete_admin
  ON public.feedback FOR DELETE TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS notifications_select ON public.notifications;
DROP POLICY IF EXISTS notifications_update_recipient ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_delete_admin ON public.notifications;

CREATE POLICY notifications_select
  ON public.notifications FOR SELECT TO authenticated
  USING (recipient_profile_id = auth.uid() OR private.is_admin());

CREATE POLICY notifications_update_recipient
  ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_profile_id = auth.uid() OR private.is_admin())
  WITH CHECK (recipient_profile_id = auth.uid() OR private.is_admin());

CREATE POLICY notifications_insert_admin
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

CREATE POLICY notifications_delete_admin
  ON public.notifications FOR DELETE TO authenticated
  USING (private.is_admin());

GRANT USAGE ON SCHEMA private TO authenticated;

COMMIT;
