# Production TODO

Status legend: `[x]` code completed in this repo, `[ ]` external launch work that requires deployment credentials or operator access.

## Data And Demo Accounts

- [x] Keep sample school content in the data layer, not inline page arrays.
- [x] Support Supabase as the primary source for students, parents, teachers, classes, requests, notifications, and schedule extras.
- [x] Add a production data policy so production can fail closed instead of silently rendering bundled sample fallbacks.
- [x] Keep bundled fallback data only for local/offline development and automated smoke tests.
- [x] Treat malformed Supabase URL env as unconfigured so production mode fails closed instead of creating a broken client.
- [x] Seed demo account data through SQL under `supabase/seed/`.
- [x] Add a service-role operator script to create/invite required Supabase Auth users without hardcoding passwords.
- [x] Add class detail fields needed by parent catalog and class list screens.
- [x] Make parent directory rows resolve from `parents -> profiles -> parent_students -> students`.
- [x] Parent student picker/profile screen reads through Data APIs instead of a hardcoded page helper.
- [x] Header identity, header notifications, dashboard alerts, dashboard request preview, and parent home schedule read through Auth/Data APIs instead of hardcoded sample people/classes.
- [x] Keep QA persona demo account records under `src/lib/data/mock` instead of shared UI/helper modules.
- [x] Keep Settings demo/QA account tooling behind `NEXT_PUBLIC_ENABLE_TEST_PERSONA_UI=true`; production Settings no longer renders demo account names or route launchers.
- [x] Remove the anon-key REST data helper; feedback and student note repositories now use the cookie-aware server Supabase client and current `feedback` / `student_records` tables.
- [x] Create real Supabase Auth users for each demo/operator account listed in the seed SQL.
- [x] Run migrations and seed SQL in the target Supabase project.
- [x] Confirm Row Level Security policies match intended admin, parent, teacher, and student visibility with `npm run verify:production`.

## Auth And Access

- [x] Route login/signup through Supabase when env vars are configured.
- [x] Route forgot-password and recovered password updates through Supabase Auth instead of a local-only submitted state.
- [x] Keep local demo navigation available only when explicitly enabled for non-production use.
- [x] Disable demo/no-op login and signup automatically when `NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true`.
- [x] Protect `/dashboard` routes with a Supabase session requirement when production remote-data mode is enabled.
- [x] Protect `/api/data/*`, `/api/dashboard-presentation`, and `/api/admin/*` with JSON fail-closed responses when production remote-data mode is enabled.
- [x] Document that `NEXT_PUBLIC_SIGNUP_INVITE_CODE` is only a casual gate and must be paired with Supabase Auth/RLS.
- [x] Set production `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false`.
- [x] Set production `NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true`.
- [x] Configure Supabase email confirmation/reset URLs to the deployed domain.
- [x] Promote the first operator to `admin` with SQL after Auth user creation.

## Product Workflows

- [x] Admin class setup renders repository/API rows instead of Figma-only hardcoded rows.
- [x] Parent core class list reads from the class API.
- [x] Parent enrichment class list reads from the class API.
- [x] Parent catalog reads available enrichment classes from the class API.
- [x] Parent catalog submits enrichment choices to `/api/data/enrichment-requests`.
- [x] Enrichment request review persists approve/reject changes.
- [x] Student, teacher, class, notification, and schedule write endpoints exist for primary CRUD surfaces.
- [x] Class detail roster pages read students/enrollments from the data layer.
- [x] Student profile, roster, and schedule detail pages read records from the data layer.
- [x] Student profile edits and timeline notes persist through `/api/data/students/[id]/profile` and `student_records` instead of local-only modal state.
- [x] Class roster status/removal actions use the roster API when Supabase is the source.
- [x] Core/enrichment class detail "Add Student" actions create student/enrollment rows through `/api/data/classes/[id]/roster` instead of adding local-only roster rows.
- [x] Core/enrichment class detail edit/remove actions persist through `/api/data/classes` and fail visibly when Supabase is unavailable.
- [x] Core/enrichment class detail roster edit/remove actions persist through `/api/data/classes/[id]/roster` instead of mutating local-only table state.
- [x] Schedule event creation persists through `/api/data/schedule-extras` and only updates the calendar after the API succeeds.
- [x] Dashboard schedule renders Supabase-derived class schedules and saved schedule events when cloud data is available; the hardcoded weekday template is now local/offline fallback only.
- [x] Add Student notes persist to `students.support_notes` and student repository reads include that column, instead of echoing notes only in the immediate create response.
- [x] Add Student, Create Teacher, and class create/edit no longer submit placeholder values (`TBD`, `New enrollment`, `pending@school.edu`, fake phone numbers, fake seat fallbacks) into write payloads; optional fields persist as blanks/nulls and required teacher/email/seat inputs must be real before saving.
- [x] Notification read actions, teacher edits, class duplication, and enrichment request status changes persist through APIs or revert/fail visibly; they no longer create or message local-only durable state after API failure.
- [x] Dashboard roster/export/approval feedback uses inline app status, modal previews, or downloaded files instead of blocking browser alerts.
- [x] Class roster enrollment removal uses an in-app confirmation modal instead of a blocking browser confirmation.
- [x] Remove QA/scaffold routes and visible design-review copy from production surfaces; `/dashboard/alt`, `/dashboard/classes/check`, and `/dashboard/students/[id]/schedule/alt` are no longer app routes, class/student screens no longer expose `Figma` annotations or `TBD` labels, and unavailable photo upload / local-preview copy is gone.
- [x] Login and dashboard surfaces are usable on mobile: the login form centers on narrow screens, the desktop sidebar collapses behind mobile navigation, dashboard header chrome fits at 390px, home stats stack, parent student selector wraps, and class setup controls/table use mobile-safe wrapping and internal scrolling.
- [x] Add invite/admin flows for creating users without manual Supabase Dashboard work.
- [x] Account settings persists display name and notification preferences through `/api/data/me` and `user_preferences` instead of local-only form state.
- [x] Support form persists authenticated requests through `/api/data/support-tickets` and `support_tickets` instead of showing fake local success.
- [x] Parent feedback form persists structured submissions through `/api/data/feedback` and the RLS-protected `feedback` table instead of being a dead Submit button.
- [x] Directory exports create real CSV downloads and contact actions open mail drafts instead of showing non-functional "future integration" copy.
- [x] Add audit trails for admin class, student, teacher, enrollment, request, and schedule changes beyond the current `student_records` notes.
- [x] Add billing/invoice workflows if the academy needs payments.

## Reliability And Verification

- [x] Add route validation with `npm run check:routes`.
- [x] Add `npm run check:workspace-hygiene` so ignored OS/editor scratch files cannot pollute the production script/release surface unnoticed.
- [x] Add `npm run check:operator-scripts` so CI syntax-checks every CJS operator script and verifies launch/backup/restore/monitor help screens load without secrets.
- [x] Add `npm run check:ci-workflows` so CI fails if GitHub Actions drops one of the documented production gates or scheduled monitor checks.
- [x] Add `npm run check:production-todo` so CI fails if new unchecked repo-owned production work appears outside the disclosed external restore blocker.
- [x] Add `npm run check:env-contract` so CI fails if `.env.example` is missing/ignored/stale or if real `.env*` files are tracked.
- [x] Keep Playwright smoke tests for login and critical dashboard routes.
- [x] Run route validation and changed-file syntax checks before handoff.
- [x] Run full lint, production build, and Playwright smoke tests from a non-OneDrive verifier copy.
- [x] Add CI that runs lint, route checks, build, and Playwright on every PR.
- [x] Patch dependency audit findings and verify `npm audit --audit-level=moderate` reports zero vulnerabilities.
- [x] Add `npm run verify:production` for Supabase users, seed rows, RLS smoke checks, deployed health endpoints, and production env flags.
- [x] Add `npm run check:data-boundaries` so pages/components/shared lib helpers cannot import bundled mock fixtures directly or reintroduce known inline sample literals.
- [x] Extend `npm run check:data-boundaries` so app routes cannot import demo account data directly; demo account lists are limited to QA/persona bridge components.
- [x] Extend `npm run check:data-boundaries` to fail if the removed anon-key REST helper is recreated or imported.
- [x] Extend `npm run check:data-boundaries` to catch remaining hardcoded enrichment class names outside `src/lib/data/mock`; parent catalog schedule chips now render fetched class names instead of inline sample titles.
- [x] Add `npm run check:api-auth-guards` so protected data/admin APIs cannot miss route-level production session guards when proxy behavior differs by platform.
- [x] Add `npm run check:sql-security` so legacy anon/public read SQL cannot slip into production.
- [x] Add `npm run check:server-secret-boundaries` so CI fails if the service-role helper loses its server-only boundary or the Supabase admin client is imported outside API route handlers.
- [x] Add `npm run check:restore-target-guard` so CI proves restore-target verification refuses the production Supabase project ref before any networked checks.
- [x] Add `npm run check:production-health-guards` so CI starts the built app and proves `/api/health.productionGuards` is locked down before deploy.
- [x] Add hardened response security headers in `next.config.ts` and `npm run check:security-headers` so CI proves CSP, HSTS, frame, referrer, permissions, opener, and content-type headers are served by the built app.
- [x] Add `npm run check:production-auth-guard` so CI proves dashboard routes and protected data APIs fail closed without Supabase env, malformed Supabase env, and failing Supabase Auth when production flags are enabled.
- [x] Add `npm run check:responsive` so CI catches mobile page-level horizontal overflow on login and critical dashboard routes.
- [x] Extend `/api/health` and `npm run monitor:production` so scheduled production monitoring fails if locked-down production flags drift.
- [x] Use a Webpack production build command so local/CI builds do not depend on Turbopack native bindings.
- [x] Extend production verification to include `user_preferences`, `support_tickets`, protected deployed data APIs, and the hosted `/reset-password` recovery page.
- [x] Add route-level data API session guards so deployed Vercel route handlers fail closed even when proxy behavior differs by platform.
- [x] Configure external uptime/error monitoring on the deployed app using `OPERATIONS.md`.
- [x] Add and run a logical app-table backup/restore drill for the linked Supabase project so demo data has a verified export/reload path while managed backups are unavailable.
- [x] Extend `npm run drill:logical-backup-restore` to fall back to the server-only Supabase service-role client when `SUPABASE_ACCESS_TOKEN` is not exported.
- [x] Extend `npm run check:supabase-backups` to report Supabase organization plan and database version, making free-plan managed-restore blockers explicit.
- [x] Add `npm run verify:restore-target` so a future managed backup restore can be validated against a separate Supabase project without deployed app checks, and fail immediately if pointed at the production project ref.
- [ ] Run a database backup/restore drill in Supabase using `OPERATIONS.md`.

## Launch Operations

- [x] Document production env vars and launch commands.
- [x] Configure Vercel project env vars.
- [x] Deploy to Vercel or the chosen host.
- [x] Run `npm run verify:production` against the deployed production environment.
- [x] Verify the deployed domain with a real Supabase-backed login.
- [x] Run a browser QA pass on desktop and mobile.
- [x] Add privacy policy/terms if real student or parent data will be stored.

## Verification Evidence

Executed on 2026-05-17 from `/tmp/cia-verify-current`, a synchronized copy of the current worktree outside OneDrive CloudStorage because ESLint/Next dependency loading from the OneDrive-backed `node_modules` path stalls for minutes per run:

- [x] `npm ci`
- [x] `npm run lint` (0 errors; 269 warnings remain for existing image/effect style debt)
- [x] `npx tsc --noEmit --pretty false`
- [x] `npm run check:routes` (`150` internal path references checked)
- [x] `npm run check:data-boundaries` (app/components/shared lib keep sample rows behind repositories or mock-data modules)
- [x] `npm run check:api-auth-guards` (protected API route methods include route-level auth guards)
- [x] `rg` confirmed blocked demo person/class literals do not appear under `src/lib` outside `src/lib/data/mock`
- [x] `rg` confirmed no `supabase/rest`, `restSelectRows`, or `restHeadCount` references remain
- [x] `npm run check:sql-security` (no anon/public read SQL detected)
- [x] `node --check scripts/check-production-auth-guard.cjs`
- [x] `node --check scripts/verify-production-readiness.cjs`
- [x] `npm audit --audit-level=moderate` (`found 0 vulnerabilities`)
- [x] `NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false npm run build` with the normal NVM Node (`next build --webpack`; Next.js `16.2.6`, 56 app routes generated including `/api/data/support-tickets`, `/api/data/feedback`, and `/reset-password`)
- [x] `npm run check:production-auth-guard` after the production-flag build (starts `next start` with Supabase env cleared and verifies `/dashboard` plus `/dashboard/classes` redirect to `/login?auth=configuration`, while `/api/data/students`, `/api/data/me`, and `/api/dashboard-presentation` return JSON `503`)
- [x] `CIA_AUTH_GUARD_INVALID_SUPABASE=true npm run check:production-auth-guard` after the production-flag build (same fail-closed behavior when Supabase URL env is malformed)
- [x] `CIA_AUTH_GUARD_FAKE_SUPABASE=true npm run check:production-auth-guard` after the production-flag build (uses a fake failing Supabase Auth service plus a cookie-backed session and verifies protected dashboard/API routes return the production configuration failure path)
- [x] Follow-up API guard hardening on 2026-05-17: added route-level `requireRemoteApiSession()` coverage to protected POST/PATCH/DELETE data/admin handlers, added `npm run check:api-auth-guards` to CI, and expanded `npm run check:production-auth-guard` to exercise protected write/admin APIs.
- [x] Follow-up verification on 2026-05-17: `npm run lint -- --quiet`, `npx tsc --noEmit --pretty false`, `npm run check:routes`, `npm run check:data-boundaries`, `npm run check:api-auth-guards`, `npm run check:sql-security`, `NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false npm run build`, and all three production auth guard modes passed after the write/admin API guard expansion.
- [x] Follow-up data-boundary hardening on 2026-05-17: removed hardcoded enrichment names from `schedule-calendar-shared` and the parent catalog schedule card, generated remote schedule events from Supabase `classes.schedule_summary`, and kept weekday template rows behind the fallback data layer.
- [x] `npm run test:e2e` (3 Playwright smoke tests passed)
- [x] Direct Playwright QA for `/dashboard/parents/students` on `http://localhost:3000` (7 API-fed student options, fallback-source notice visible, urgent history rendered once, 0 console errors, 0 failed requests)
- [x] Direct Playwright QA for `/dashboard` and `/dashboard/parents/home` on `http://localhost:3000` (header uses neutral/auth-fed identity instead of sample names, parent home renders API-fed schedule/alerts, no legacy hardcoded alert text, 0 console errors, 0 failed requests)
- [x] Direct API/browser QA for `/api/data/me` and `/dashboard/settings` on `http://localhost:3000` (GET reports unavailable without Supabase, PATCH fails closed with `503`, settings save surfaces the backend error, email field is read-only unless changed through Auth/admin)
- [x] Direct API/browser QA for `/api/data/support-tickets` and `/dashboard/support` on `http://localhost:3000` (POST fails closed with `503` when Supabase is unset; support form surfaces the backend error instead of showing fake success)
- [x] Direct API/browser QA for `/api/data/feedback` and `/dashboard/parents/feedback` on `http://localhost:3000` (POST fails closed with `503` when Supabase is unset; parent feedback form surfaces the backend error instead of silently doing nothing)
- [x] Direct API/browser QA for `/api/data/students/[id]/profile` and `/dashboard/students/[id]` on `http://localhost:3000` (PATCH/POST fail closed with `503` when Supabase is unset; edit and note modals surface backend errors instead of silently saving local-only changes)
- [x] Direct API/browser QA for `/api/data/schedule-extras` and `/dashboard/schedule` on `http://localhost:3000` (POST fails closed with `503` when Supabase is unset; create event modal surfaces the backend error instead of saving a view-only event)
- [x] Direct API/browser QA for `/api/data/classes/[id]/roster` and class detail add-student modals on `http://localhost:3000` (POST fails closed with `503` when Supabase is unset; modals show backend errors instead of adding local-only roster rows)
- [x] Direct API/browser QA for class detail edit/remove flows (class edits/deletes use `/api/data/classes`; roster edits/deletes use `/api/data/classes/[id]/roster`; UI surfaces `503` when Supabase is unset instead of mutating local-only state)
- [x] Direct browser QA for `/forgot-password` and `/reset-password` on `http://localhost:3000` (forms fail closed when Supabase is unset; reset route is present for Supabase recovery redirects)
- [x] Direct production-mode browser/API QA on `http://localhost:3151` with `NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true`, `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false`, and no Supabase env (`/dashboard` redirects to `/login?auth=configuration`; login and signup stay on their auth pages and show the Supabase-required error; dashboard main never renders; 0 console errors)
- [x] Direct browser QA for `/dashboard/classes` on `http://localhost:3000` (CSV export action completes with a real download event)
- [x] Full ESLint JSON count from clean copy (`161` files, `0` errors, `269` existing warnings)
- [x] `npm run provision:supabase-users -- --help` (operator provisioning script loads successfully; real run requires service-role env)
- [x] `npm run verify:production -- --help` (operator verifier loads successfully; real run requires production env)
- [x] Supabase linked project `cadkwvfybunnxoppqlfc` migration history aligned with remote placeholders, baseline `20260429120000` recorded, production migrations `20260516170000` through `20260517125000` applied, and `track2_demo_seed.sql` loaded through the Supabase Management API.
- [x] `npm run provision:supabase-users -- --require-passwords --reset-passwords` against the linked Supabase project (5 required Auth users/profiles ready).
- [x] Vercel production env configured for Supabase URL/anon key, server-only service role key, `NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true`, `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false`, and deployment-specific signup invite code; service-role env was repaired on 2026-05-17 after `vercel env pull` exposed an empty value.
- [x] Production deployed to `https://curious-innovators-academy.vercel.app` (latest inspected deployment `dpl_8o1Y6Bke6AR5FqvbWJqomJi8SsPr`, status Ready, aliased to the canonical domain).
- [x] Live anonymous API checks on `https://curious-innovators-academy.vercel.app` verified `/api/data/me`, `/api/data/students`, and `/api/dashboard-presentation` return JSON `401`.
- [x] `npm run verify:production` against `https://curious-innovators-academy.vercel.app` (20 ok, 0 warn, 0 fail).
- [x] Live Playwright QA on desktop and mobile viewports: real Supabase login succeeds, `/api/data/me` returns the signed-in profile, and `/dashboard/parents/students` renders 6 remote student options with no console errors or non-aborted failed requests.
- [x] Supabase Auth URL configuration updated: `site_url=https://curious-innovators-academy.vercel.app` with production/Vercel/localhost redirect allow-list.
- [x] `npm run monitor:production` against `https://curious-innovators-academy.vercel.app` (public health/version/legal/login routes passed; protected anonymous data APIs returned JSON `401`); `.github/workflows/production-monitor.yml` added for 5-minute scheduled external monitoring from GitHub Actions.
- [x] Runtime Supabase config hardened after the final redeploy: server/proxy routes now read Supabase URL/anon/service-role values through runtime env access, while browser auth keeps the public `NEXT_PUBLIC_*` config.
- [x] `npm run verify:production` after runtime-config hardening, redeploy, and demo verifier password reset (20 ok, 0 warn, 0 fail).
- [x] Live admin API service-role smoke after the final redeploy: authenticated admin reached `/api/admin/users` validation (`400 Valid email is required`) instead of the `503` server-secret-missing path.
- [x] CI now runs `npm run check:restore-target-guard` and `npm audit --audit-level=moderate`, so the restore-target safety check and dependency audit gate are enforced on PRs/pushes.
- [x] CI now runs `npm run check:operator-scripts`, so production operator scripts cannot drift into syntax/load failures outside live operator runs.
- [x] CI now runs `npm run check:production-todo`, keeping the production checklist from silently accumulating undisclosed unchecked repo work.
- [x] CI now runs `npm run check:env-contract`; `.gitignore` explicitly unignores `.env.example` while keeping real `.env*` files ignored, and `.env.example` documents production, restore-target, backup, logical-drill, auth-guard, and provisioning env inputs.
- [x] CI now runs `npm run check:server-secret-boundaries`; service-role access moved from shared `src/lib/data/env.ts` into server-only `src/lib/data/server-env.ts`, and `src/lib/supabase/admin.ts` is marked `server-only`.
- [x] `npm run verify:restore-target -- --help` and `npm run verify:production -- --help` load the shared verifier successfully; deliberate safety test `CIA_PRODUCTION_SUPABASE_PROJECT_REF=cadkwvfybunnxoppqlfc npm run verify:restore-target` fails immediately because it is pointed at the production project.
- [x] Follow-up CI enforcement verification: `node --check scripts/check-restore-target-guard.cjs`, `npm run check:restore-target-guard`, `npm audit --audit-level=moderate`, `npm run check:api-auth-guards`, `npm run check:sql-security`, `npm run lint -- --quiet`, and `npm run check:data-boundaries` all passed.
- [x] Follow-up production TODO gate verification: `node --check scripts/check-production-todo.cjs` and `npm run check:production-todo` passed, confirming exactly 2 allowed external blocker entries and 0 unexpected unchecked production TODO items.
- [x] Follow-up server-secret boundary verification: `node --check scripts/check-server-secret-boundaries.cjs`, `npm run check:server-secret-boundaries`, `npx tsc --noEmit --pretty false`, `npm run check:api-auth-guards`, `npm run check:production-todo`, `npm run lint -- --quiet`, and `npm run check:data-boundaries` all passed.
- [x] Production redeployed after server-secret boundary hardening (`dpl_8o1Y6Bke6AR5FqvbWJqomJi8SsPr`); `npm run monitor:production`, `npm run verify:production` (20 ok, 0 warn, 0 fail), and live authenticated admin API smoke all passed on `https://curious-innovators-academy.vercel.app`.
- [x] Follow-up env contract verification: `node --check scripts/check-env-contract.cjs`, `npm run check:env-contract`, `npm run check:production-todo`, `npm run check:server-secret-boundaries`, `npm run lint -- --quiet`, `npm run check:data-boundaries`, and `npm audit --audit-level=moderate` all passed. `git check-ignore .env.example` confirms `.env.example` is committable while real `.env*` files remain ignored.
- [x] Follow-up operator script verification: `node --check scripts/check-operator-scripts.cjs`, `npm run check:operator-scripts`, `npm run check:production-todo`, `npm run check:env-contract`, `npm run lint -- --quiet`, `npm run check:data-boundaries`, and `npm audit --audit-level=moderate` all passed. The operator gate syntax-checked 15 CJS scripts and loaded 6 launch/backup/restore/monitor help screens without secrets.
- [x] CI workflow contract added: `npm run check:ci-workflows` verifies `.github/workflows/ci.yml` still runs install, lint, route, operator, TODO, env, data-boundary, API-auth, SQL-security, server-secret, restore-target, audit, build, production-auth, and Playwright gates, and verifies `.github/workflows/production-monitor.yml` keeps the 5-minute production monitor.
- [x] Follow-up CI workflow verification: `node --check scripts/check-ci-workflows.cjs`, `npm run check:ci-workflows`, `npm run check:operator-scripts`, `npm run check:production-todo`, `npm run check:env-contract`, `npm run check:data-boundaries`, `npm audit --audit-level=moderate`, and `npm run lint -- --quiet` all passed. The operator gate now syntax-checks 16 CJS scripts.
- [x] Final local/runtime verification pass: `NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false npm run build`, all three `npm run check:production-auth-guard` modes, `npm run test:e2e`, and `npm run monitor:production` all passed.
- [x] Settings QA boundary verification: production-default local render on `http://localhost:3164/dashboard/settings` with `NEXT_PUBLIC_ENABLE_TEST_PERSONA_UI=false` returned `200`, showed Account settings, and did not render `Demo & QA tools`, `All demo accounts`, `Joseph Collins`, or `Mary Lee`; QA-enabled render on `http://localhost:3165/dashboard/settings` with `NEXT_PUBLIC_ENABLE_TEST_PERSONA_UI=true` rendered the extracted QA panel and demo account list without console/page errors.
- [x] Follow-up Settings QA hardening verification: `npm run check:data-boundaries`, `npm run check:routes`, `npm run check:api-auth-guards`, `npm run check:sql-security`, `npm run check:server-secret-boundaries`, `npm run check:ci-workflows`, `npm run check:operator-scripts`, `npm run check:env-contract`, `npm run check:restore-target-guard`, `npm audit --audit-level=moderate`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false npm run build`, all three production auth guard modes, and `npm run test:e2e` passed.
- [x] Production redeployed after Settings QA boundary hardening (`dpl_9iAR3qffPjYyNCjvAyVPhi5FBhPp`, status Ready, aliased to `https://curious-innovators-academy.vercel.app`); post-deploy `npm run monitor:production` passed on the canonical domain.
- [x] Production health now reports non-secret `productionGuards`, and `npm run monitor:production` fails unless remote data is required, demo login is disabled, test persona UI is disabled, Figma capture is disabled, mock notification header is disabled, and the signup invite code is deployment-specific.
- [x] Follow-up production health guard verification: `node --check scripts/monitor-production.cjs`, `npm run check:operator-scripts`, `npm run check:production-todo`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run check:ci-workflows`, `npm run check:env-contract`, `npm audit --audit-level=moderate`, `NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false NEXT_PUBLIC_ENABLE_TEST_PERSONA_UI=false NEXT_PUBLIC_ENABLE_FIGMA_CAPTURE=false NEXT_PUBLIC_ENABLE_MOCK_NOTIFICATION_HEADER=false NEXT_PUBLIC_SIGNUP_INVITE_CODE=local-build-check npm run build`, all three production auth guard modes, and `npm run test:e2e` passed.
- [x] Production redeployed after health guard hardening (`dpl_A9PNGUx3EwaksYfarhopdHYrUA4F`, status Ready, aliased to `https://curious-innovators-academy.vercel.app`); post-deploy `/api/health` returned all six `productionGuards` as `true`, and post-deploy `npm run monitor:production` passed on the canonical domain.
- [x] CI now runs `npm run check:production-health-guards` immediately after the production-flag build, with `NEXT_PUBLIC_ENABLE_TEST_PERSONA_UI=false`, `NEXT_PUBLIC_ENABLE_FIGMA_CAPTURE=false`, `NEXT_PUBLIC_ENABLE_MOCK_NOTIFICATION_HEADER=false`, and a deployment-specific signup invite value in the build env.
- [x] Follow-up CI health guard verification: `node --check scripts/check-production-health-guards.cjs`, `npm run check:production-health-guards`, `npm run check:operator-scripts`, `npm run check:ci-workflows`, `npm run check:production-todo`, `npm run check:routes`, `npm run check:data-boundaries`, `npm run check:api-auth-guards`, `npm run check:server-secret-boundaries`, `npm run check:sql-security`, `npm run check:env-contract`, `npm run check:restore-target-guard`, `npm audit --audit-level=moderate`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false NEXT_PUBLIC_ENABLE_TEST_PERSONA_UI=false NEXT_PUBLIC_ENABLE_FIGMA_CAPTURE=false NEXT_PUBLIC_ENABLE_MOCK_NOTIFICATION_HEADER=false NEXT_PUBLIC_SIGNUP_INVITE_CODE=ci-production-health-check npm run build`, fresh-build `npm run check:production-health-guards`, all three production auth guard modes, and `npm run test:e2e` passed.
- [x] Production redeployed after CI health guard enforcement (`dpl_C3dFEuFVeB2aU7FjijLLbdpS66JK`, status Ready, aliased to `https://curious-innovators-academy.vercel.app`); post-deploy `npm run monitor:production` passed and live `/api/health` returned all six `productionGuards` as `true`.
- [x] Follow-up Add Student note persistence hardening: `serverInsertStudent` now writes create-form notes to `students.support_notes`, `fetchStudentsResolved` / `fetchStudentByIdResolved` select `support_notes`, `mapStudentRow` maps it into `notes`, and `npm run check:data-boundaries` now fails if this persistence path is removed. Verification passed: `node --check scripts/check-data-boundaries.cjs`, `npm run check:data-boundaries`, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run check:production-todo`, production-flag `npm run build`, fresh-build `npm run check:production-health-guards`, and `npm run test:e2e`.
- [x] Production redeployed after Add Student note persistence hardening (`dpl_C5eLkxQySgBuzsUjgpmLTK5pCmAm`, status Ready, aliased to `https://curious-innovators-academy.vercel.app`); post-deploy `npm run monitor:production` passed and live `/api/health` returned all six `productionGuards` as `true`.
- [x] Follow-up local-only action hardening: notification mark-all-read now reverts on API failure, teacher edit failure reverts and reports the update was not saved, class duplicate no longer appends a fake copied row after API failure, and enrichment request status failure reverts with a sync error. `npm run check:data-boundaries` now rejects local-only action text in app/components/lib. Verification passed: `node --check scripts/check-data-boundaries.cjs`, `npm run check:data-boundaries`, `rg` found no `locally only` / `local edit only` / `local-only` action text under app/components/lib, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run check:production-todo`, production-flag `npm run build`, fresh-build `npm run check:production-health-guards`, and `npm run test:e2e`.
- [x] Production redeployed after local-only action hardening (`dpl_GdB8Pk9bFdZvYZfQ4rWfB1vZZn8b`, status Ready, aliased to `https://curious-innovators-academy.vercel.app`); post-deploy `npm run monitor:production` passed and live `/api/health` returned all six `productionGuards` as `true`.
- [x] Follow-up blocking-alert hardening: student roster export, class roster export/status/remove/note preview, and approval record copy now use inline status, modal note preview, or downloaded TSV/JSON fallbacks instead of `window.alert`. `npm run check:data-boundaries` now rejects blocking browser alerts in app/components/lib. Verification passed: `node --check scripts/check-data-boundaries.cjs`, `npm run check:data-boundaries`, `rg` found no `window.alert` / `alert(` calls under app/components/lib, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run check:production-todo`, production-flag `npm run build`, fresh-build `npm run check:production-health-guards`, and `npm run test:e2e`.
- [x] Production redeployed after blocking-alert hardening (`dpl_6FBuP6t8sza4JMaJM5Rp4VnaSYWA`, status Ready, aliased to `https://curious-innovators-academy.vercel.app`); post-deploy `npm run monitor:production` passed and live `/api/health` returned all six `productionGuards` as `true`.
- [x] Follow-up blocking-confirm hardening: class roster enrollment removal now opens an app confirmation modal and only calls `/api/data/classes/[id]/roster` after confirmation; `npm run check:data-boundaries` now rejects `window.confirm` in app/components/lib. Verification passed: `node --check scripts/check-data-boundaries.cjs`, `npm run check:data-boundaries`, `rg` found no `window.confirm` / `window.alert` / `alert(` calls under app/components/lib, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run check:production-todo`, production-flag `npm run build`, fresh-build `npm run check:production-health-guards`, and `npm run test:e2e`.
- [x] Production redeployed after blocking-confirm hardening (`dpl_7D1HusqtccJqK3zE3ZdmoGH3UPsN`, status Ready, aliased to `https://curious-innovators-academy.vercel.app`); post-deploy `npm run monitor:production` passed and live `/api/health` returned all six `productionGuards` as `true`.
- [x] Follow-up placeholder-write hardening: Add Student now starts notes blank and submits blank parent/notes instead of `TBD` / `New enrollment`; Create Teacher requires email and submits blank subjects instead of `TBD` / `pending@school.edu`; `serverInsertTeacher` stores blank optional phone instead of `(555) 000-0000`; `npm run check:data-boundaries` now rejects these placeholder write regressions. Verification passed: `node --check scripts/check-data-boundaries.cjs`, `npm run check:data-boundaries`, refined `rg` found no removed placeholder write patterns, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run check:production-todo`, production-flag `npm run build`, fresh-build `npm run check:production-health-guards`, and `npm run test:e2e`.
- [x] Production redeployed after placeholder-write hardening (`dpl_CQyLdyXgaj4K78KL5heh6W8itGRY`, status Ready, aliased to `https://curious-innovators-academy.vercel.app`); post-deploy `npm run monitor:production` passed and live `/api/health` returned all six `productionGuards` as `true`.
- [x] Follow-up class placeholder-write hardening: class create/edit now require a real teacher roster name and valid enrolled/capacity seat value before saving, submit trimmed schedule as blank when optional, and no longer send `TBD` or `0/1` fallbacks into `/api/data/classes`. `npm run check:data-boundaries` now rejects these class write regressions. Verification passed: `node --check scripts/check-data-boundaries.cjs`, `npm run check:data-boundaries`, refined `rg` found no removed class placeholder write patterns, `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run check:production-todo`, production-flag `npm run build`, fresh-build `npm run check:production-health-guards`, and `npm run test:e2e`.
- [x] Production redeployed after class placeholder-write hardening (`dpl_EM2AAzukREMDT6TNpcdw6ks8JehC`, status Ready, aliased to `https://curious-innovators-academy.vercel.app`); post-deploy `npm run monitor:production` passed and live `/api/health` returned all six `productionGuards` as `true`.
- [x] Follow-up production-surface cleanup: removed `/dashboard/alt` because it queried a non-existent dashboard API and rendered zero metrics, removed `/dashboard/classes/check` because it hardcoded sample selected IDs, removed `/dashboard/students/[id]/schedule/alt` because it was an offline-template-only route, replaced user-facing `TBD` fallbacks with explicit missing-data labels, removed visible design-review copy, removed the dead parent photo edit control, replaced local/offline preview failure messages with explicit "no record was created" errors, and cleaned fallback banners that said demo/local/development/production. `npm run check:data-boundaries` now rejects these scaffold routes and production-hostile copy regressions. Verification passed: focused `rg` found no remaining production-surface hits, `npm run check:data-boundaries`, `npm run check:routes`, `npx tsc --noEmit --pretty false` after regenerating Next route types, `npm run lint -- --quiet`, `npm run check:production-todo`, production-flag `npm run build` with 54 generated routes, fresh-build `npm run check:production-health-guards`, and `npm run test:e2e`.
- [x] Production redeployed after production-surface cleanup (`dpl_3o9QCgMoKKS9VaofftcNm3q9eDXb`, status Ready, aliased to `https://curious-innovators-academy.vercel.app`); post-deploy `npm run monitor:production` passed and live `/api/health` returned all six `productionGuards` as `true`.
- [x] Follow-up mobile responsiveness fix: local Playwright mobile viewport `390x844` checked `/login`, `/dashboard`, `/dashboard/classes`, `/dashboard/students`, `/dashboard/parents/students`, and `/dashboard/settings`; each route reported `docScrollWidth=390`, `bodyScrollWidth=390`, no non-scrollable horizontal offenders, and dashboard routes reported `mainScrollWidth=390`. Visual screenshots confirmed login is centered and class table columns no longer overlap.
- [x] Production redeployed after mobile responsiveness fix (`dpl_A7QcVZKi13BpA3fR5TijquRTVNJs`, status Ready, aliased to `https://curious-innovators-academy.vercel.app`); post-deploy `npm run monitor:production` passed, live `/api/health` returned all six `productionGuards` as `true`, and live mobile `/login` plus protected `/dashboard -> /login?auth=required&next=%2Fdashboard` both reported `docScrollWidth=390`, `bodyScrollWidth=390`, and no horizontal offenders.
- [x] Responsive regression gate added after the mobile incident: `e2e/responsive.spec.ts` checks `/login`, `/dashboard`, `/dashboard/classes`, `/dashboard/students`, `/dashboard/parents/students`, and `/dashboard/settings` at `390x844`, allowing only intentional internal scrollers and failing on page-level horizontal overflow. CI now runs `npm run check:responsive` after installing Playwright Chromium, and `npm run check:ci-workflows` enforces that gate.
- [x] Workspace hygiene cleanup removed ignored `.DS_Store` and `scripts/.!77334!check-routes.mjs` scratch artifacts; `npm run check:workspace-hygiene` now fails on OS/editor scratch files and `tmp/` directories outside generated build/dependency folders, and CI enforces the gate.
- [x] Follow-up workspace hygiene verification: `npm run check:workspace-hygiene`, `npm run check:operator-scripts`, `npm run check:ci-workflows`, `npm run check:production-todo`, `npm run lint -- --quiet`, and `npx tsc --noEmit --pretty false` passed after clearing a stale generated `.next/dev` validator cache.
- [x] Security header hardening added: `next.config.ts` now serves CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Cross-Origin-Opener-Policy` across the app; production CSP excludes `unsafe-eval` while dev allows it for React diagnostics; `npm run check:security-headers` starts the built app and verifies those headers on `/login` and `/api/health`; CI and `npm run check:ci-workflows` now enforce the gate. Verification passed: `npx tsc --noEmit --pretty false`, `npm run lint -- --quiet`, `npm run check:operator-scripts`, `npm run check:ci-workflows`, production-flag `npm run build`, `npm run check:security-headers`, `npm run check:production-health-guards`, and `npm run test:e2e`.
- [x] `npm run check:supabase-backups` added as the operator gate for Supabase backup/PITR metadata and app-table visibility.
- [x] `npm run check:supabase-backups` now reports linked project `cadkwvfybunnxoppqlfc` is on Supabase organization plan `free`, database version `17.6.1.052`, `pitr_enabled=false`, `completed backups=0`, `walg_enabled=true`, and 16 app tables visible.
- [x] `npm run check:supabase-backups` now falls back to the authenticated Supabase CLI plus server-only service-role table checks when `SUPABASE_ACCESS_TOKEN` is not exported; current CLI fallback confirms database version `17.6.1.052`, `pitr_enabled=false`, `completed backups=0`, `walg_enabled=true`, and 16 app tables visible.
- [x] Follow-up backup-checker verification after CLI fallback support: `node --check scripts/check-supabase-backups.cjs`, `npm run lint -- --quiet`, and `npm run check:data-boundaries` passed; `npm run check:supabase-backups` reached the linked project through the CLI fallback and failed only because no managed backup/PITR restore path exists.
- [x] `npm run drill:logical-backup-restore` against linked project `cadkwvfybunnxoppqlfc` exported all 16 app tables, reloaded the temporary snapshot, validated row counts, demo seed contracts, and FK-like references, then removed the temporary artifact (`profiles=24`, `students=6`, `classes=5`, `invoices=3`).
- [x] Follow-up logical drill fallback verification: `node --check scripts/drill-logical-backup-restore.cjs`, `npm run drill:logical-backup-restore`, `npm run check:production-todo`, `npm run lint -- --quiet`, and `npm run check:data-boundaries` passed. The drill used the Supabase service-role client without `SUPABASE_ACCESS_TOKEN`, exported 16 tables, validated row counts/demo contract/FK-like references, and removed the temporary artifact.
- [x] Latest restore-gate recheck on 2026-05-17: `npm run verify:restore-target -- --help` loaded successfully, and `npm run check:supabase-backups` reached linked project `cadkwvfybunnxoppqlfc` through the Supabase CLI fallback before failing only because `pitr_enabled=false` and `completed backups=0`.
- [ ] `npm run check:supabase-backups` against linked project `cadkwvfybunnxoppqlfc` currently fails because Supabase reports `pitr_enabled=false`, `completed backups=0`, `walg_enabled=true`, and 16 required app tables visible. Prior Management API evidence showed organization plan `free`; the current CLI fallback cannot print plan without `SUPABASE_ACCESS_TOKEN`. A real restore drill still requires enabling/upgrading Supabase backups and restoring into a non-production target. Latest recheck after the `dpl_A7QcVZKi13BpA3fR5TijquRTVNJs` deploy reached the project and failed on the same managed-backup/PITR condition.
