-- Account settings preferences for notification controls.
-- Safe to run after 20260429120000_track2_rls_schema.sql.

CREATE TABLE IF NOT EXISTS public.user_preferences (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  digest_weekly boolean NOT NULL DEFAULT true,
  class_alerts boolean NOT NULL DEFAULT true,
  request_alerts boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_preferences_select_self_or_admin ON public.user_preferences;
CREATE POLICY user_preferences_select_self_or_admin
  ON public.user_preferences FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS user_preferences_insert_self_or_admin ON public.user_preferences;
CREATE POLICY user_preferences_insert_self_or_admin
  ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS user_preferences_update_self_or_admin ON public.user_preferences;
CREATE POLICY user_preferences_update_self_or_admin
  ON public.user_preferences FOR UPDATE TO authenticated
  USING (profile_id = auth.uid() OR private.is_admin())
  WITH CHECK (profile_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS user_preferences_delete_admin ON public.user_preferences;
CREATE POLICY user_preferences_delete_admin
  ON public.user_preferences FOR DELETE TO authenticated
  USING (private.is_admin());

CREATE OR REPLACE FUNCTION public.touch_user_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_preferences_touch_updated_at ON public.user_preferences;
CREATE TRIGGER user_preferences_touch_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.touch_user_preferences_updated_at();
