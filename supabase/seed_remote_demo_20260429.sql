-- Legacy remote demo seed intentionally disabled.
--
-- This file used to create broad anon/public read policies for a one-off demo
-- project. That is not acceptable for production student, parent, or billing
-- data. Keep it as a tripwire so old operator notes fail closed instead of
-- silently exposing data.
--
-- Current launch path:
--   1. Run migrations in supabase/migrations/.
--   2. Run `npm run provision:supabase-users` with server-side Supabase env.
--   3. Run supabase/seed/track2_demo_seed.sql.
--   4. Run `npm run verify:production` against the deployed environment.

DO $$
BEGIN
  RAISE EXCEPTION 'seed_remote_demo_20260429.sql is disabled because it created public anon read policies. Use supabase/migrations/ plus supabase/seed/track2_demo_seed.sql.';
END;
$$;
