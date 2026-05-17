# Production Operations

## Uptime Checks

Configured repo monitor:

- `.github/workflows/production-monitor.yml` runs every 5 minutes and on demand.
- It executes `npm run monitor:production` from GitHub Actions, outside Vercel.
- It checks `/api/health`, `/api/version`, `/login`, `/privacy`, `/terms`, verifies anonymous protected APIs still return JSON `401`, and fails if production guard flags drift from the locked-down configuration.
- Alert path: failed scheduled workflow run notification in GitHub.

For a paid uptime vendor, mirror the same checks against:

- `GET /api/health` every 60 seconds
- alert after 2 consecutive failures
- validate response JSON contains `"ok": true`
- validate `productionGuards.requireRemoteData`, `demoLoginDisabled`, `testPersonaUiDisabled`, `figmaCaptureDisabled`, `mockNotificationHeaderDisabled`, and `signupInviteConfigured` are all `true`

Use `GET /api/data/status` manually during launch to confirm Supabase URL/session state without exposing secrets.

## Error Monitoring

Before launch, connect the hosting provider's runtime logs or an error-monitoring service to alert on:

- Next.js route handler 5xx responses
- failed Supabase Auth calls
- failed roster/class/student write APIs
- repeated `source: "unavailable"` responses when `NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true`
- any appearance of anon/public read SQL caught by `npm run check:sql-security`

The scheduled GitHub monitor covers public-route failures and anonymous auth-regression failures. Use Vercel runtime logs plus Supabase Auth logs for request-level triage when it fails.

## Supabase Backup Checks

Supabase managed backups must be enabled for the production project. First run:

```bash
SUPABASE_ACCESS_TOKEN=<management token> \
SUPABASE_PROJECT_REF=<project ref> \
npm run check:supabase-backups
```

This calls Supabase's Management API from outside the app, confirms backup/PITR metadata, and verifies the expected app tables are visible in the target project.
It also prints the organization plan because Supabase's restore-to-new-project
flow is limited to paid plans with physical backups enabled, and PITR is a paid
add-on.

If `SUPABASE_ACCESS_TOKEN` is not exported, the same command falls back to the
authenticated Supabase CLI for project/backup metadata and uses the server-only
`SUPABASE_SERVICE_ROLE_KEY` from local env files for table visibility checks.
That fallback can prove whether PITR/completed backups exist, but it cannot
print the organization plan.

While managed backups are unavailable, run the logical app-table drill as a
temporary demo-data recovery check:

```bash
SUPABASE_ACCESS_TOKEN=<management token> \
SUPABASE_PROJECT_REF=<project ref> \
npm run drill:logical-backup-restore
```

The logical drill exports the app tables to a temporary JSON snapshot, reloads
that snapshot outside Supabase, validates required row counts, demo seed
contracts, and FK-like relationships, then removes the artifact unless
`CIA_KEEP_BACKUP_ARTIFACT=true` is set. This is only a repository-owned recovery
check for the current demo dataset; it is not a substitute for managed Supabase
backup/PITR when real student data is stored.

If `SUPABASE_ACCESS_TOKEN` is not exported, the logical drill falls back to
`SUPABASE_SERVICE_ROLE_KEY` from local env files and exports the same app-table
snapshot through the Supabase service-role client.

Then run a restore drill before storing real student data:

1. Confirm scheduled backups are enabled for the production project tier.
2. Restore the latest backup into a separate non-production project.
3. Run migrations through `supabase/migrations/`.
4. Verify row counts for `profiles`, `students`, `parents`, `teachers`, `classes`, `enrollments`, `class_requests`, `schedule_events`, `student_records`, `feedback`, `invoices`, `user_preferences`, `support_tickets`, and `audit_events`.
5. Run the restore-target verifier against the restored project:

```bash
CIA_PRODUCTION_SUPABASE_PROJECT_REF=<production project ref> \
SUPABASE_URL=https://<restored-project-ref>.supabase.co \
SUPABASE_ANON_KEY=<restored anon key> \
SUPABASE_SERVICE_ROLE_KEY=<restored service role key> \
CIA_RLS_ADMIN_EMAIL=<admin smoke email> \
CIA_RLS_ADMIN_PASSWORD=<admin smoke password> \
CIA_RLS_PARENT_EMAIL=<parent smoke email> \
CIA_RLS_PARENT_PASSWORD=<parent smoke password> \
CIA_RLS_TEACHER_EMAIL=<teacher smoke email> \
CIA_RLS_TEACHER_PASSWORD=<teacher smoke password> \
CIA_RLS_STUDENT_EMAIL=<student smoke email> \
CIA_RLS_STUDENT_PASSWORD=<student smoke password> \
npm run verify:restore-target
```

The restore verifier fails if the target Supabase project ref matches
`CIA_PRODUCTION_SUPABASE_PROJECT_REF`. It validates database/Auth/RLS state and
skips deployed app URL checks because the restored database should be isolated
from the live app.
6. Run a login and read-only dashboard smoke test against an app instance pointed at the restored project.

Current linked-project blocker as of 2026-05-17: Supabase Management API reports
the organization plan is `free`, `pitr_enabled=false`, `completed backups=0`,
and 16 app tables visible. Do not store real student data until this is upgraded
or otherwise backed by a managed restore path.

## Launch Gates

Do not treat the deployment as production-ready until:

- `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false`
- `NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true`
- `SUPABASE_SERVICE_ROLE_KEY` exists only as a server-side secret
- RLS policies are verified with admin, parent, teacher, and student users
- `npm run check:sql-security` passes
- `/privacy` and `/terms` are published on the deployed domain
- `npm run verify:production` passes against the deployed environment
