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
npm run check:routes
npm run check:operator-scripts
npm run check:ci-workflows
npm run check:production-todo
npm run check:env-contract
npm run check:data-boundaries
npm run check:api-auth-guards
npm run check:sql-security
npm run check:server-secret-boundaries
npm run check:restore-target-guard
npm run build
npm run check:production-health-guards
npm run check:security-headers
npm run check:production-auth-guard
npm run test:e2e
npm run verify:production -- --help
npm run verify:restore-target -- --help
npm run check:supabase-backups -- --help
npm run drill:logical-backup-restore -- --help
```

## Data Model

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

More operational detail is in `DEPLOYMENT.md`; the production checklist is in `PRODUCTION_TODO.md`; uptime, monitoring, and backup runbooks are in `OPERATIONS.md`.

`npm run check:operator-scripts` syntax-checks every CJS script under `scripts/`
and loads help screens for launch/backup/restore/monitor operator scripts
without requiring secrets.

`npm run check:ci-workflows` enforces the Vercel-only deploy contract. GitHub
Actions workflow files should not exist in this repo; push to `main` and Vercel
builds/deploys the app.

`npm run check:env-contract` fails if `.env.example` is missing, still ignored
by git, missing an operator/restore/verifier env placeholder, or if any real
`.env*` file other than `.env.example` is tracked.

`npm run check:data-boundaries` fails if app pages, shared components, or
general `src/lib` helpers import bundled mock fixtures directly or hardcode the
known demo student/staff/class sample literals. Demo rows belong behind
`src/lib/data/repositories/`, `src/lib/data/mock/`, and the `/api/data/*` routes.
The same check fails if the removed anon-key REST data helper is recreated;
server data reads should use the cookie-aware Supabase server client so RLS sees
the signed-in user.

`npm run check:server-secret-boundaries` fails if the Supabase service-role
helpers lose their `server-only` boundary, if the admin Supabase client is
imported outside API route handlers, or if a source file uses a
`NEXT_PUBLIC_*` service-role env name.

`npm run check:api-auth-guards` fails if a protected `/api/data/*`,
`/api/admin/*`, or `/api/dashboard-presentation` route method lacks a
route-level production session guard. Proxy protects the deployed app too, but
the route handlers must fail closed on their own.

`npm run check:production-auth-guard` requires a prior `npm run build`. It starts
the built app with production flags, clears Supabase env vars, and fails if
dashboard routes render instead of redirecting to login or protected read/write
data and admin APIs return fallback payloads instead of JSON
auth/configuration errors.
Set `CIA_AUTH_GUARD_INVALID_SUPABASE=true` with the same command to also verify
malformed Supabase URL env fails closed. Set `CIA_AUTH_GUARD_FAKE_SUPABASE=true`
to verify a syntactically valid but failing Supabase Auth endpoint also fails
closed.

`npm run check:production-health-guards` requires a prior `npm run build`. It
starts the built app with locked-down production public flags and fails unless
`/api/health` reports every non-secret production guard as enabled.

`npm run check:security-headers` requires a prior `npm run build`. It starts
the built app and fails unless `/login` and `/api/health` serve the configured
CSP, frame, content-type, HSTS, referrer, permissions, and opener headers.

Before treating a hosted environment as ready, run `npm run verify:production`
with the target Supabase/Vercel environment loaded. It checks production-safe
flags, required demo/operator Auth users, seeded tables, support-ticket schema, RLS smoke credentials,
audit/security dependency status, admin/parent/teacher/student RLS scope, and
deployed health/legal/login endpoints. It also expects protected data APIs to
reject anonymous requests with `401`, which proves the deployed app is not
serving data outside a Supabase session.

Run `npm run check:supabase-backups` and a managed restore drill before storing
real student data. `npm run drill:logical-backup-restore` is available as a
temporary demo-data recovery check while Supabase managed backups are not yet
enabled, but it does not replace PITR/daily-backup restore validation. The
logical drill uses `SUPABASE_ACCESS_TOKEN` when available and otherwise falls
back to the server-only `SUPABASE_SERVICE_ROLE_KEY` from local env files. After
restoring a managed backup into a separate Supabase project, run
`npm run verify:restore-target` with the restored project's Supabase URL,
anon key, service-role key, RLS smoke credentials, and
`CIA_PRODUCTION_SUPABASE_PROJECT_REF=<production-ref>`; the verifier fails if it
is accidentally pointed at production.
