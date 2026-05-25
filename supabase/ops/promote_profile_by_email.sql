-- Run in Supabase Dashboard → SQL Editor (postgres role bypasses RLS).
-- Use after the auth user exists and handle_new_user has created public.profiles (default role: parent).
--
-- Pick one target email and desired role: admin | parent | student | teacher

-- Example: promote a tester as admin
-- UPDATE public.profiles
-- SET role = 'admin'::public.app_role,
--     updated_at = now()
-- WHERE lower(email) = lower('admin@example.com');

-- Example: promote existing user by email
-- UPDATE public.profiles
-- SET role = 'parent'::public.app_role,
--     updated_at = now()
-- WHERE lower(email) = lower('parent@example.com');
