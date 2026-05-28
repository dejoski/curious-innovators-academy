-- Applied in order: this file mirrors supabase/migrations/20260429120000_track2_rls_schema.sql

-- Curious Innovators Academy — Track 2: RLS-first schema
-- Authorization uses public.profiles.role only (never user_metadata in RLS).
-- Security definer helpers live in schema `private` (not exposed to Data API by default).

-- ---------------------------------------------------------------------------
-- Extensions & enums
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'parent', 'student', 'teacher');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_status') THEN
    CREATE TYPE public.workflow_status AS ENUM ('pending', 'approved', 'waitlisted', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'program_track') THEN
    CREATE TYPE public.program_track AS ENUM ('core', 'enrichment');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'class_status') THEN
    CREATE TYPE public.class_status AS ENUM ('active', 'full');
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- Private helpers (SECURITY DEFINER, not in public schema)
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;

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

CREATE OR REPLACE FUNCTION private.teacher_teaches_student(p_student_id uuid)
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
    JOIN public.classes c ON c.id = e.class_id
    JOIN public.teachers t ON t.id = c.teacher_id
    WHERE e.student_id = p_student_id
      AND t.profile_id = auth.uid()
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

CREATE OR REPLACE FUNCTION private.student_is_self(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
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

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'parent',
  display_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_email_idx ON public.profiles (lower(email));
CREATE UNIQUE INDEX profiles_email_unique_idx ON public.profiles (lower(email));

CREATE TABLE public.parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parents_profile_unique UNIQUE (profile_id)
);

CREATE TABLE public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  subjects text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  program public.program_track NOT NULL DEFAULT 'core',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teachers_profile_unique UNIQUE (profile_id)
);

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE REFERENCES public.profiles (id) ON DELETE SET NULL,
  display_name text NOT NULL,
  guardian_label text,
  avatar_url text,
  age_years integer,
  level text,
  track public.program_track NOT NULL DEFAULT 'core',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX students_profile_id_idx ON public.students (profile_id);

CREATE TABLE public.parent_students (
  parent_id uuid NOT NULL REFERENCES public.parents (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, student_id)
);

CREATE INDEX parent_students_student_id_idx ON public.parent_students (student_id);

CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  teacher_id uuid NOT NULL REFERENCES public.teachers (id) ON DELETE RESTRICT,
  program public.program_track NOT NULL DEFAULT 'core',
  capacity integer NOT NULL DEFAULT 30,
  block text,
  level text,
  location text,
  description text,
  prerequisites text,
  schedule_summary text NOT NULL DEFAULT '',
  status public.class_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX classes_teacher_id_idx ON public.classes (teacher_id);

CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  status public.workflow_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT enrollments_class_student_uniq UNIQUE (class_id, student_id),
  CONSTRAINT enrollments_no_pending_status CHECK (status <> 'pending')
);

CREATE INDEX enrollments_student_id_idx ON public.enrollments (student_id);
CREATE INDEX enrollments_class_id_idx ON public.enrollments (class_id);

CREATE TABLE public.class_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  requested_by_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status public.workflow_status NOT NULL DEFAULT 'pending',
  block text,
  level text,
  option_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_requests_pending_only CHECK (status = 'pending')
);

CREATE INDEX class_requests_student_idx ON public.class_requests (student_id);
CREATE INDEX class_requests_class_idx ON public.class_requests (class_id);

CREATE TABLE public.class_request_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_request_id uuid,
  student_id uuid NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  requested_by_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  decided_by_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  status public.workflow_status NOT NULL,
  block text,
  level text,
  option_label text,
  reason text,
  requested_at timestamptz,
  decided_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_request_decisions_no_pending CHECK (status <> 'pending')
);

CREATE INDEX class_request_decisions_student_idx ON public.class_request_decisions (student_id, decided_at DESC);
CREATE INDEX class_request_decisions_class_idx ON public.class_request_decisions (class_id, decided_at DESC);
CREATE INDEX class_request_decisions_original_request_idx ON public.class_request_decisions (original_request_id);

CREATE TABLE public.schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES public.classes (id) ON DELETE SET NULL,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  location text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX schedule_events_class_idx ON public.schedule_events (class_id);
CREATE INDEX schedule_events_starts_at_idx ON public.schedule_events (starts_at);

CREATE TABLE public.student_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  author_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX student_records_student_idx ON public.student_records (student_id);

CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  author_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes (id) ON DELETE SET NULL,
  body text NOT NULL,
  rating smallint CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX feedback_student_idx ON public.feedback (student_id);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  href text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_recipient_idx ON public.notifications (recipient_profile_id);

CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_actor_profile_idx ON public.audit_events (actor_profile_id);
CREATE INDEX audit_events_created_at_idx ON public.audit_events (created_at DESC);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students (id) ON DELETE SET NULL,
  family_label text,
  invoice_number text NOT NULL UNIQUE,
  amount_cents integer NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'open',
  issued_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL DEFAULT CURRENT_DATE,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX invoices_student_idx ON public.invoices (student_id);
CREATE INDEX invoices_due_date_idx ON public.invoices (due_date DESC);

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  category text NOT NULL,
  contact_email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_tickets_profile_idx ON public.support_tickets (profile_id);
CREATE INDEX support_tickets_created_at_idx ON public.support_tickets (created_at DESC);

CREATE TABLE public.user_preferences (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  digest_weekly boolean NOT NULL DEFAULT true,
  class_alerts boolean NOT NULL DEFAULT true,
  request_alerts boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE VIEW public.class_catalog_availability
WITH (security_invoker = true)
AS
WITH enrollment_counts AS (
  SELECT
    class_id,
    count(*) FILTER (WHERE status = 'approved')::integer AS enrolled_count,
    count(*) FILTER (WHERE status = 'waitlisted')::integer AS waitlist_count
  FROM public.enrollments
  GROUP BY class_id
),
request_counts AS (
  SELECT
    class_id,
    count(*) FILTER (WHERE status = 'pending')::integer AS pending_count
  FROM public.class_requests
  GROUP BY class_id
)
SELECT
  c.id AS class_id,
  COALESCE(e.enrolled_count, 0)::integer AS enrolled_count,
  COALESCE(r.pending_count, 0)::integer AS pending_count,
  COALESCE(e.waitlist_count, 0)::integer AS waitlist_count,
  (COALESCE(e.enrolled_count, 0) + COALESCE(r.pending_count, 0))::integer AS reserved_count,
  GREATEST(c.capacity - (COALESCE(e.enrolled_count, 0) + COALESCE(r.pending_count, 0)), 0)::integer AS seats_remaining,
  CASE
    WHEN c.capacity <= 0 THEN 'Open'
    WHEN c.capacity - (COALESCE(e.enrolled_count, 0) + COALESCE(r.pending_count, 0)) <= 0 THEN 'Full'
    WHEN c.capacity - (COALESCE(e.enrolled_count, 0) + COALESCE(r.pending_count, 0)) = 1 THEN '1 seat left'
    ELSE (c.capacity - (COALESCE(e.enrolled_count, 0) + COALESCE(r.pending_count, 0)))::text || ' seats left'
  END AS availability_label
FROM public.classes c
LEFT JOIN enrollment_counts e ON e.class_id = c.id
LEFT JOIN request_counts r ON r.class_id = c.id;

-- ---------------------------------------------------------------------------
-- Triggers: profile row on signup + role change guard + touch updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name, email)
  VALUES (
    NEW.id,
    'parent',
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.profiles_guard_role_and_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE TRIGGER profiles_guard_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.profiles_guard_role_and_email();

-- updated_at touch on profiles handled in guard trigger

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_request_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR private.is_admin());

CREATE POLICY profiles_update_self_or_admin
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR private.is_admin())
  WITH CHECK (id = auth.uid() OR private.is_admin());

-- parents
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

-- teachers
CREATE POLICY teachers_select
  ON public.teachers FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR profile_id = auth.uid()
    OR private.parent_or_student_has_teacher(teachers.id)
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

-- students
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

-- parent_students
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

-- classes
CREATE POLICY classes_select
  ON public.classes FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('parent', 'student')
    )
    OR private.teacher_owns_class(classes.id)
  );

CREATE POLICY classes_write_admin
  ON public.classes FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- enrollments
CREATE POLICY enrollments_select
  ON public.enrollments FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.parent_can_see_student(enrollments.student_id)
    OR private.student_is_self(enrollments.student_id)
    OR private.teacher_owns_class(enrollments.class_id)
  );

CREATE POLICY enrollments_write_admin
  ON public.enrollments FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- class_requests
CREATE POLICY class_requests_select
  ON public.class_requests FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR requested_by_profile_id = auth.uid()
    OR private.parent_can_see_student(class_requests.student_id)
    OR private.teacher_owns_class(class_requests.class_id)
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
    OR private.teacher_owns_class(class_requests.class_id)
  )
  WITH CHECK (
    private.is_admin()
    OR private.teacher_owns_class(class_requests.class_id)
  );

CREATE POLICY class_requests_delete_admin
  ON public.class_requests FOR DELETE TO authenticated
  USING (private.is_admin());

-- class_request_decisions
CREATE POLICY class_request_decisions_select
  ON public.class_request_decisions FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.parent_can_see_student(class_request_decisions.student_id)
    OR private.student_is_self(class_request_decisions.student_id)
    OR private.teacher_owns_class(class_request_decisions.class_id)
  );

CREATE POLICY class_request_decisions_insert_admin_or_teacher
  ON public.class_request_decisions FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.teacher_owns_class(class_request_decisions.class_id)
  );

-- schedule_events
CREATE POLICY schedule_events_select
  ON public.schedule_events FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR class_id IS NULL
    OR private.parent_or_student_enrolled_in_class(schedule_events.class_id)
    OR private.teacher_owns_class(schedule_events.class_id)
  );

CREATE POLICY schedule_events_write_admin
  ON public.schedule_events FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- student_records (notes)
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

-- feedback
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

-- notifications
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

-- audit_events
CREATE POLICY audit_events_select_admin
  ON public.audit_events FOR SELECT TO authenticated
  USING (private.is_admin());

CREATE POLICY audit_events_insert_actor
  ON public.audit_events FOR INSERT TO authenticated
  WITH CHECK (actor_profile_id = auth.uid() OR private.is_admin());

-- invoices
CREATE POLICY invoices_select_scoped
  ON public.invoices FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR (student_id IS NOT NULL AND private.parent_can_see_student(student_id))
    OR (student_id IS NOT NULL AND private.student_is_self(student_id))
  );

CREATE POLICY invoices_write_admin
  ON public.invoices FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- support_tickets
CREATE POLICY support_tickets_select_scoped
  ON public.support_tickets FOR SELECT TO authenticated
  USING (private.is_admin() OR profile_id = auth.uid());

CREATE POLICY support_tickets_insert_self
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() OR private.is_admin());

CREATE POLICY support_tickets_update_admin
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- user_preferences
CREATE POLICY user_preferences_select_self
  ON public.user_preferences FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR private.is_admin());

CREATE POLICY user_preferences_upsert_self
  ON public.user_preferences FOR ALL TO authenticated
  USING (profile_id = auth.uid() OR private.is_admin())
  WITH CHECK (profile_id = auth.uid() OR private.is_admin());

-- Default privileges on hosted Supabase cover API roles; private helpers are execution-scoped only.
GRANT USAGE ON SCHEMA private TO authenticated;
