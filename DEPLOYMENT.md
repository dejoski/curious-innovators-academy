# Deployment notes — Curious Innovators Academy

Concise ops reference for this Next.js dashboard (App Router under `src/app`).
See `OPERATIONS.md` for uptime monitoring, error alerting, backup/restore drills, and launch gates.

## Local build & run

| Command | Purpose |
|--------|---------|
| `npm install` | Dependencies |
| `npm run dev` | Dev server (default **http://localhost:3000**) |
| `npm run build` | Production build (`next build --webpack`) |
| `npm start` | Serve after `build` |
| `npm run lint` | ESLint |
| `npm run check:routes` | Validates internal links vs `src/app` routes (`scripts/check-routes.mjs`) |
| `npm run check:operator-scripts` | Syntax-checks CJS operator scripts and verifies launch/backup/restore/monitor help screens load without secrets |
| `npm run check:ci-workflows` | Verifies GitHub Actions still runs the documented production gates and scheduled production monitor |
| `npm run check:production-todo` | Fails if `PRODUCTION_TODO.md` has unchecked repo-owned launch work beyond the disclosed external restore blocker |
| `npm run check:env-contract` | Verifies `.env.example` is committable, documents operator env vars, and no real `.env*` file is tracked |
| `npm run check:data-boundaries` | Verifies app/components/shared lib helpers do not import bundled mock fixtures or the removed anon-key REST helper directly |
| `npm run check:api-auth-guards` | Verifies protected API route methods include route-level production session guards |
| `npm run check:sql-security` | Fails if Supabase SQL grants public anon read access to app data |
| `npm run check:server-secret-boundaries` | Fails if service-role helpers lose their server-only boundary or admin clients leak outside API routes |
| `npm run check:restore-target-guard` | Verifies restore-target checks fail fast when pointed at the production Supabase project ref |
| `npm run check:production-health-guards` | Starts the built app and verifies `/api/health.productionGuards` stays locked down before deploy |
| `npm run check:security-headers` | Starts the built app and verifies CSP, HSTS, frame, referrer, permissions, opener, and content-type headers |
| `npm run check:production-auth-guard` | Starts the built app with production flags and verifies dashboard, protected data read/write APIs, and admin APIs fail closed when Supabase auth is missing or unavailable |
| `npm run test:e2e` | Playwright (`e2e/`); installs browsers with `npx playwright install` on first machine |
| `npm run provision:supabase-users` | Creates/invites required Supabase Auth demo/operator users with service-role env loaded |
| `npm run verify:production` | Operator launch verifier for target Supabase/Vercel env, demo users, RLS smoke checks, seed rows, and deployed endpoints |
| `npm run verify:restore-target` | Verifies a restored non-production Supabase target has the expected seed rows and RLS behavior, and fails if pointed at production |
| `npm run monitor:production` | External production smoke monitor for health, locked-down production flags, legal/login pages, and anonymous protected API rejection |
| `npm run check:supabase-backups` | Operator gate for Supabase managed backup/PITR metadata and expected app-table visibility |
| `npm run drill:logical-backup-restore` | Temporary logical app-table export/reload drill for demo-data recovery while managed backups are unavailable |

Playwright uses **port 3150** (`PORT=3150 npm run dev` or auto-started server in `playwright.config.ts`). Use 3150 when reproducing E2E locally.

## Environment variables

Keep `.env*` out of git (see `.gitignore`). Supabase URLs and anon keys are **public-by-design** in the browser; never expose `SERVICE_ROLE`/server secrets via `NEXT_PUBLIC_*`.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key (client-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for admin user provisioning route; never expose through `NEXT_PUBLIC_*` |
| `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` | Set `"false"` to hide the `/login` “Continue in demo mode” bypass |
| `NEXT_PUBLIC_REQUIRE_REMOTE_DATA` | Set `"true"` in production so repository calls do not fall back to bundled sample rows |
| `NEXT_PUBLIC_SIGNUP_INVITE_CODE` | Invite string required on `/signup` (defaults to **`CIA-DEMO-2026`** when unset — **set a deployment-specific value in production**) |
| `CIA_APP_URL` | Deployed app URL for `npm run verify:production` endpoint checks |
| `CIA_RLS_ADMIN_EMAIL` / `CIA_RLS_ADMIN_PASSWORD` | Admin credential used by `npm run verify:production` to prove admin-scoped reads |
| `CIA_RLS_PARENT_EMAIL` / `CIA_RLS_PARENT_PASSWORD` | Parent credential used by `npm run verify:production` to prove parent RLS scope |
| `CIA_RLS_TEACHER_EMAIL` / `CIA_RLS_TEACHER_PASSWORD` | Teacher credential used by `npm run verify:production` to prove teacher RLS scope |
| `CIA_RLS_STUDENT_EMAIL` / `CIA_RLS_STUDENT_PASSWORD` | Student credential used by `npm run verify:production` to prove student self-scope |
| `CIA_PRODUCTION_SUPABASE_PROJECT_REF` | Required by `npm run verify:restore-target`; protects against validating the production project as a restore target |
| `CIA_PARENT_COLLINS_PASSWORD` | Optional password used by `npm run provision:supabase-users`; otherwise that user is invited by email |
| `CIA_DEMO_USER_PASSWORD` | Optional fallback password for all required launch/demo users during provisioning |

Signing up uses Supabase `auth.signUp` when URL + anon key are set; otherwise the app treats signup like local/demo navigation (same pattern as login without backend). Malformed Supabase URL env is treated as unconfigured, and production-mode Supabase Auth service failures redirect dashboard users to `/login?auth=configuration` while protected APIs return JSON `503`. Password recovery uses Supabase `resetPasswordForEmail` and redirects recovery sessions to `/reset-password` for `auth.updateUser({ password })`. For production, set `NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true` and `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false`; this disables demo/no-op login and signup, protects `/dashboard` plus `/api/data/*` routes behind a Supabase session, and prevents a broken database configuration from looking like a valid demo tenant.

### Supabase schema and seed

Run migrations in order, including `supabase/migrations/20260516170000_production_data_contract.sql`, `supabase/migrations/20260517120000_account_preferences.sql`, `supabase/migrations/20260517123000_support_tickets.sql`, `supabase/migrations/20260517124000_feedback_submission_contract.sql`, and `supabase/migrations/20260517125000_student_profile_writes.sql`, before loading the demo seed. Then provision the Auth users listed at the top of `supabase/seed/track2_demo_seed.sql`:

```bash
npm run provision:supabase-users -- --require-passwords
```

Use `--reset-passwords` only when you intentionally want to rotate the required demo/operator account passwords. Without a password env for a missing optional account, the script sends an invite instead of printing or inventing credentials.

After user provisioning, run `supabase/seed/track2_demo_seed.sql` from the Supabase SQL Editor. The seed fails closed if the required profile rows are missing. The production contract includes parent-visible invoices with admin-only writes, authenticated support ticket capture, structured parent feedback submissions, and student profile/timeline note writes; populate `invoices.payment_url` with your payment processor checkout links when payments are enabled.

After migrations, seed, env vars, and deployment are configured, run:

```bash
npm run verify:production
```

The verifier fails closed when required Auth users, seeded rows, production flags, RLS smoke credentials, deployed public endpoints, or protected data API `401` checks are missing.

Before storing real student data, also run `npm run check:supabase-backups` and
restore the latest managed Supabase backup into a separate non-production
project. `npm run drill:logical-backup-restore` proves the current demo app
tables can be exported, reloaded, and validated from a temporary snapshot, but it
does not replace a managed Supabase restore drill. The logical drill uses
`SUPABASE_ACCESS_TOKEN` when available and otherwise falls back to the
server-only `SUPABASE_SERVICE_ROLE_KEY` from local env files. After the managed
restore, run `npm run verify:restore-target` with the restored project's
`SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`, anon key, service-role key, RLS
smoke credentials, and `CIA_PRODUCTION_SUPABASE_PROJECT_REF=<production-ref>`;
it validates the restored database/Auth/RLS contract and skips deployed app
endpoint checks.

For CI/local prelaunch checks before a real Supabase project is connected, run a production build and the fail-closed auth guard together:

```bash
NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false npm run build
npm run check:production-auth-guard
CIA_AUTH_GUARD_INVALID_SUPABASE=true npm run check:production-auth-guard
CIA_AUTH_GUARD_FAKE_SUPABASE=true npm run check:production-auth-guard
npm run check:security-headers
```

In those local checks, dashboard routes must redirect to `/login?auth=configuration` and protected data APIs must return JSON `503`. In a deployed environment with Supabase configured but no browser session, protected data APIs must return JSON `401`.

### Signup invite code (production)

The invite gate is enforced in client code (`src/lib/signup-invite.ts`): users must enter the exact string returned by `getExpectedSignupInviteCode()`. Configure `NEXT_PUBLIC_SIGNUP_INVITE_CODE` per environment — it is readable in the bundle, so treat it like a casual gate rather than cryptographic security (pair with Supabase Auth settings and Row Level Security for real isolation).

## Demo login & credentials

Login (`/login`) validates email/password; with Supabase configured it calls **`signInWithPassword`**; otherwise it navigates without a backend session (**demo**) only when `NEXT_PUBLIC_REQUIRE_REMOTE_DATA` is not `"true"`. **`/signup`** validates password length ≥ 6, confirm match, invite code; with Supabase it calls **`signUp`**; otherwise it navigates to `/dashboard` like demo login only outside production remote-data mode — **no Supabase password or email can be read from this app.** If a third party needs access to an existing account they must reset the password via Supabase/email or be invited by an admin.

|E2E / smoke pairing (`e2e/smoke.spec.ts`) — **local demo navigation** when Supabase env is unset||
|---|---|
| Email | `name.example@gmail.com` |
| Password | `secret12` |

These values are **not** a guarantee of a live Supabase user; with `NEXT_PUBLIC_SUPABASE_*` set, login only succeeds if Auth has a matching user and password (or use the signup / reset flows below).

### Admin API, CLI, and service role (passwords and user creation)

| Approach | Creates or sets a password without exposing `service_role` in app code? |
|----------|---------------------------------------------------------------------------|
| **`anon` / publishable key** (browser, this app) | **No.** Only public Auth flows: `signUp`, `signInWithPassword`, `resetPasswordForEmail`, OAuth, etc. You cannot call Admin REST endpoints or override another user’s password. |
| **Auth Admin REST** (`/auth/v1/admin/*`) | **Requires the service role key** (or equivalent privileged JWT). There is no supported way to administer users with the anon key alone. **Blocker for headless “set password” without a privileged key:** the Admin API refuses unprivileged credentials. |
| **Supabase CLI** | Manages projects, migrations, linking, and Postgres — **does not replace** privileged Auth Admin for creating users with arbitrary passwords without credentials. Commands like `supabase login` authenticate **you** to Supabase tooling, not End-user Auth admin operations without a linked service role secret. |
| **Supabase Dashboard** (Authentication → Users) while logged into [supabase.com](https://supabase.com) | **Yes**, as a human operator: invite a user, send recovery email, or use dashboard actions that do not embed `service_role` in this repository. |
| **Password reset email** | **Yes** for existing emails: user completes the link and picks a new password — no app secret required in the repo. |

**Conclusion:** Programmatic “set this user’s password to X” or invite users from Account settings **requires** the server-only `SUPABASE_SERVICE_ROLE_KEY` (or Dashboard). There is **no** safe substitute using only the publishable key. Do not store the service role in client code or any `NEXT_PUBLIC_*` variable.

### Admin user provisioning

`POST /api/admin/users` is the in-app production path behind Account settings → User provisioning. For the initial launch/demo contract, use `npm run provision:supabase-users` from an operator shell with service-role env loaded. Both paths require the service-role key to stay server-side.

The in-app API:

- requires a signed-in user whose `profiles.role = 'admin'`
- requires `SUPABASE_SERVICE_ROLE_KEY` on the server
- invites a user by email or creates a confirmed user with a temporary password
- upserts `public.profiles` with `role`, `display_name`, and `email`
- writes an `audit_events` row

### Real login path: signup with invite code (no service role)

1. Deploy or run locally with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set (see `.env.example`).
2. Open **`/signup`**. Enter full name, email, password (≥ 6 characters), confirm password, and the invite code from `NEXT_PUBLIC_SIGNUP_INVITE_CODE`, or the default **`CIA-DEMO-2026`** if unset.
3. If the project has **Confirm email** enabled (Auth → Providers → Email), sign-in is blocked until the user clicks the confirmation link; the UI shows a “check your email” style message from `auth-bridge.ts`. Disable confirmation for internal dev projects if you need immediate login, or check the inbox/spam folder.
4. After confirmation (if required), open **`/login`** and sign in with the same email and password.

Invalid invite codes are rejected before `signUp` runs (`src/lib/supabase/auth-bridge.ts`).

### Promote `profiles.role` (admin / parent / student / teacher)

New users get **`parent`** by default via the `handle_new_user` trigger on `auth.users`. To change role, run SQL in the **Supabase SQL Editor** (runs with privileges that bypass normal RLS for maintenance). See commented examples in `supabase/ops/promote_profile_by_email.sql`. Only **admins** can change `role` or `email` through the Data API (`profiles_guard_role_and_email`); direct SQL in the Dashboard is for operators.

### Verify login locally (anon key only — no tokens printed)

With `.env.local` containing the public URL and anon key:

```bash
npm run verify:supabase-login -- you@example.com 'your-password'
```

Outputs **`OK`** or **`FAIL`** and an error message only; it does **not** print JWTs or access tokens (then signs out immediately after success).

## Persona switch (demo UX)

- **Where:** Dashboard header (“Test persona”): **Admin \| Parent \| Student**.
- **Storage:** `localStorage` key `cia-dashboard-persona` (`dashboard-persona.tsx`).
- **Default:** Renders as **admin** until the client reads storage (SSR stays deterministic).
- **Student persona:** Sidebar links use **`DEMO_STUDENT_ID = "1"`** → e.g. `/dashboard/students/1`, `/dashboard/students/1/schedule`, `/dashboard/students/1/roster`.

## Route map (high level)

| Area | Paths |
|------|--------|
| Entry | `/` → redirect to **`/login`** |
| Auth | `/login`, `/signup`, `/forgot-password`, `/reset-password` |
| Admin dashboard | `/dashboard`, `/dashboard/classes`, `/dashboard/classes/core`, `/dashboard/classes/enrichment`, `/dashboard/classes/approvals`, `/dashboard/classes/requests`, `/dashboard/students`, `/dashboard/parents`, `/dashboard/teachers`, `/dashboard/schedule`, `/dashboard/settings` |
| Parent | `/dashboard/parents/home`, `.../classes/core`, `.../classes/enrichment`, `.../catalog`, `.../students`, `.../billing`, `.../feedback` |
| Student (demo id `1`) | `/dashboard/students/1`, `.../schedule`, `.../roster` |

Dynamic segments (e.g. class/student ids) exist under `src/app/dashboard/...`; `check:routes` covers static literals in TS/TSX.

## API

- **`GET /api/health`** — JSON `{ ok, service, productionGuards }`; scheduled monitor fails if production guard flags drift from remote-data-required, demo-disabled mode.
- **`GET /api/version`** — JSON `{ "version": "<from package.json>" }`.
- **`GET/PATCH /api/data/me`** — JSON `{ profile, source }` for authenticated account chrome and Account settings profile/notification preferences; no hardcoded production header identity.
- **`GET /api/data/notifications`** — JSON `{ notifications, source }`; feeds inbox, header preview, and dashboard alert cards.
- **`GET/POST/PATCH/DELETE /api/data/classes/[id]/roster`** — reads class rosters, creates student/enrollment rows, updates roster student details/status, and removes enrollments through RLS.
- **`GET /api/data/invoices`** — JSON `{ invoices, source }`; RLS scopes rows to admins or linked parents/students.
- **`GET/POST /api/data/support-tickets`** — persists support requests to `support_tickets`; RLS scopes reads to the ticket author or admins and admin-only updates status.
- **`GET/POST /api/data/feedback`** — persists parent feedback to `feedback`; RLS scopes rows to the author, linked student family/teacher, or admins.
- **`GET/PATCH/POST /api/data/students/[id]/profile`** — reads student profile details, persists admin profile edits, and creates RLS-scoped student timeline notes.
- **`GET/POST /api/data/schedule-extras`** — reads calendar extras and creates admin-scoped schedule events; failed writes do not create local-only calendar rows.

## Vercel

- Preset **Next.js**, install `npm install`, build `npm run build`, output default unless you add config.
- No repo-specific **`vercel.json`** requirement identified for current static/UI phase; add env vars in the Vercel project when integrations land.
