-- Support ticket capture for authenticated academy users.
-- Safe to run after 20260429120000_track2_rls_schema.sql.

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  category text NOT NULL,
  contact_email text NOT NULL DEFAULT '',
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_profile_created_idx
  ON public.support_tickets (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_status_created_idx
  ON public.support_tickets (status, created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_select_self_or_admin ON public.support_tickets;
CREATE POLICY support_tickets_select_self_or_admin
  ON public.support_tickets FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS support_tickets_insert_self_or_admin ON public.support_tickets;
CREATE POLICY support_tickets_insert_self_or_admin
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS support_tickets_update_admin ON public.support_tickets;
CREATE POLICY support_tickets_update_admin
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS support_tickets_delete_admin ON public.support_tickets;
CREATE POLICY support_tickets_delete_admin
  ON public.support_tickets FOR DELETE TO authenticated
  USING (private.is_admin());

CREATE OR REPLACE FUNCTION public.touch_support_tickets_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_tickets_touch_updated_at ON public.support_tickets;
CREATE TRIGGER support_tickets_touch_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.touch_support_tickets_updated_at();
