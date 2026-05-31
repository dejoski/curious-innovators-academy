-- Consolidate account role materialization.
-- profiles.role is the canonical account role; role tables are derived records.

BEGIN;

CREATE OR REPLACE FUNCTION public.materialize_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NEW.role = 'parent' THEN
    INSERT INTO public.parents (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF NEW.role = 'teacher' THEN
    INSERT INTO public.teachers (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_materialize_role_trg ON public.profiles;
CREATE TRIGGER profiles_materialize_role_trg
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.materialize_profile_role();

INSERT INTO public.parents (profile_id)
SELECT p.id
FROM public.profiles p
WHERE p.role = 'parent'
ON CONFLICT (profile_id) DO NOTHING;

INSERT INTO public.teachers (profile_id)
SELECT p.id
FROM public.profiles p
WHERE p.role = 'teacher'
ON CONFLICT (profile_id) DO NOTHING;

DROP POLICY IF EXISTS parents_insert_admin ON public.parents;
DROP POLICY IF EXISTS parents_insert_self_or_admin ON public.parents;
CREATE POLICY parents_insert_self_or_admin
  ON public.parents FOR INSERT TO authenticated
  WITH CHECK (private.is_admin() OR profile_id = auth.uid());

COMMIT;
