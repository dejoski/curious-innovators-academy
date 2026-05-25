-- Keep the operator account in the admin role, not the parent role.
UPDATE public.profiles
SET role = 'admin'::public.app_role,
    updated_at = now()
WHERE lower(email) = lower('dejanthecrayon@gmail.com')
  AND role <> 'admin'::public.app_role;

DELETE FROM public.parents
WHERE profile_id IN (
  SELECT id
  FROM public.profiles
  WHERE lower(email) = lower('dejanthecrayon@gmail.com')
);
