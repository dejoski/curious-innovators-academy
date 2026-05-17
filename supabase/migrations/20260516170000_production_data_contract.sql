-- Production data contract additions for class/catalog surfaces.
-- Safe to run after 20260429120000_track2_rls_schema.sql.

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS block text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS prerequisites text NOT NULL DEFAULT '';

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS learning_profile text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS strengths text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS support_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS attendance_rate numeric(5, 2);

CREATE INDEX IF NOT EXISTS classes_program_block_idx
  ON public.classes (program, block);

CREATE INDEX IF NOT EXISTS class_requests_requested_by_status_idx
  ON public.class_requests (requested_by_profile_id, status);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  family_label text NOT NULL DEFAULT '',
  invoice_number text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'paid', 'past_due', 'void')),
  issued_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number)
);

CREATE INDEX IF NOT EXISTS invoices_student_id_idx
  ON public.invoices (student_id);

CREATE INDEX IF NOT EXISTS invoices_status_due_date_idx
  ON public.invoices (status, due_date);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoices_select_visible ON public.invoices;
CREATE POLICY invoices_select_visible
  ON public.invoices FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.parent_can_see_student(invoices.student_id)
    OR private.student_is_self(invoices.student_id)
  );

DROP POLICY IF EXISTS invoices_insert_admin ON public.invoices;
CREATE POLICY invoices_insert_admin
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS invoices_update_admin ON public.invoices;
CREATE POLICY invoices_update_admin
  ON public.invoices FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS invoices_delete_admin ON public.invoices;
CREATE POLICY invoices_delete_admin
  ON public.invoices FOR DELETE TO authenticated
  USING (private.is_admin());

-- Allow the server-only Supabase service role to provision users while keeping
-- browser/RLS role changes admin-only.
CREATE OR REPLACE FUNCTION public.profiles_guard_role_and_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_adm boolean;
  is_service_role boolean;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  is_service_role := auth.role() = 'service_role';
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') INTO is_adm;

  IF OLD.role IS DISTINCT FROM NEW.role AND NOT (is_adm OR is_service_role) THEN
    RAISE EXCEPTION 'insufficient privilege to change role';
  END IF;

  IF OLD.email IS DISTINCT FROM NEW.email AND NOT (is_adm OR is_service_role) THEN
    RAISE EXCEPTION 'insufficient privilege to change email';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_actor_created_idx
  ON public.audit_events (actor_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_entity_idx
  ON public.audit_events (entity_type, entity_id, created_at DESC);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_events_select_admin ON public.audit_events;
CREATE POLICY audit_events_select_admin
  ON public.audit_events FOR SELECT TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS audit_events_insert_self ON public.audit_events;
CREATE POLICY audit_events_insert_self
  ON public.audit_events FOR INSERT TO authenticated
  WITH CHECK (actor_profile_id = auth.uid() OR private.is_admin());
