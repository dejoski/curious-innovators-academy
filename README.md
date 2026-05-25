# Curious Innovators Academy

Next.js + Supabase school operations app for roster, class setup, parent enrichment requests, schedules, invoices, support tickets, parent feedback, notifications, and directory workflows.

## Local Development
 
```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
npm run lint
npx tsc --noEmit
npm run check:routes
npm run check:env-contract
npm run check:data-boundaries
npm run check:api-auth-guards
npm run check:sql-security
npm run check:server-secret-boundaries
npm run build
```

## Data Model

`SUPABASE_SCHEMA.sql` is the readable database schema reference.

Supabase is the production source of truth. Repository functions under `src/lib/data/repositories/` read from Supabase and only use bundled fallback rows for local/offline development unless `NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true`.
Malformed Supabase URL env is treated as unconfigured, and runtime Supabase Auth
failures are treated as configuration failures, so production mode fails closed
instead of trying to create a broken client or serving fallback rows.

Production env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` for server-only admin user provisioning
- `NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true`
- `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false`
- `NEXT_PUBLIC_SIGNUP_INVITE_CODE=<deployment invite code>`

Run migrations in `supabase/migrations/`, including the account-preferences, support-ticket, feedback, and student-profile-write
contract, then provision the listed Supabase Auth users with
`npm run provision:supabase-users`, then load `supabase/seed/track2_demo_seed.sql`.
