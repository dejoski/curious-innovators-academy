-- Canonical database contract for DRY app state.
-- Pending class workflow belongs in class_requests; final placement belongs in enrollments.

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS block text;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS level text;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS prerequisites text;

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_actor_profile_idx ON public.audit_events (actor_profile_id);
CREATE INDEX IF NOT EXISTS audit_events_created_at_idx ON public.audit_events (created_at DESC);

CREATE TABLE IF NOT EXISTS public.invoices (
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

CREATE INDEX IF NOT EXISTS invoices_student_idx ON public.invoices (student_id);
CREATE INDEX IF NOT EXISTS invoices_due_date_idx ON public.invoices (due_date DESC);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  category text NOT NULL,
  contact_email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_profile_idx ON public.support_tickets (profile_id);
CREATE INDEX IF NOT EXISTS support_tickets_created_at_idx ON public.support_tickets (created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  digest_weekly boolean NOT NULL DEFAULT true,
  class_alerts boolean NOT NULL DEFAULT true,
  request_alerts boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW public.class_catalog_availability
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

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_events_select_admin ON public.audit_events;
CREATE POLICY audit_events_select_admin
  ON public.audit_events FOR SELECT TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS audit_events_insert_actor ON public.audit_events;
CREATE POLICY audit_events_insert_actor
  ON public.audit_events FOR INSERT TO authenticated
  WITH CHECK (actor_profile_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS invoices_select_scoped ON public.invoices;
CREATE POLICY invoices_select_scoped
  ON public.invoices FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR (student_id IS NOT NULL AND private.parent_can_see_student(student_id))
    OR (student_id IS NOT NULL AND private.student_is_self(student_id))
  );

DROP POLICY IF EXISTS invoices_write_admin ON public.invoices;
CREATE POLICY invoices_write_admin
  ON public.invoices FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS support_tickets_select_scoped ON public.support_tickets;
CREATE POLICY support_tickets_select_scoped
  ON public.support_tickets FOR SELECT TO authenticated
  USING (private.is_admin() OR profile_id = auth.uid());

DROP POLICY IF EXISTS support_tickets_insert_self ON public.support_tickets;
CREATE POLICY support_tickets_insert_self
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS support_tickets_update_admin ON public.support_tickets;
CREATE POLICY support_tickets_update_admin
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS user_preferences_select_self ON public.user_preferences;
CREATE POLICY user_preferences_select_self
  ON public.user_preferences FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS user_preferences_upsert_self ON public.user_preferences;
CREATE POLICY user_preferences_upsert_self
  ON public.user_preferences FOR ALL TO authenticated
  USING (profile_id = auth.uid() OR private.is_admin())
  WITH CHECK (profile_id = auth.uid() OR private.is_admin());

ALTER TABLE public.enrollments
  DROP CONSTRAINT IF EXISTS enrollments_no_pending_status;
ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_no_pending_status CHECK (status <> 'pending') NOT VALID;

ALTER TABLE public.class_requests
  DROP CONSTRAINT IF EXISTS class_requests_pending_only;
ALTER TABLE public.class_requests
  ADD CONSTRAINT class_requests_pending_only CHECK (status = 'pending') NOT VALID;
