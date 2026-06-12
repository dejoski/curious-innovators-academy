# Curious Innovators Academy

## Parent Dashboard Invariants

- Treat selected-student routing, parent/admin role boundaries, class catalog truth, schedule rendering, history copy, and notification state as product invariants.
- Resolve class details from canonical Supabase/catalog rows. Class catalog availability math belongs in the database; use `class_catalog_availability` for enrolled, pending, waitlisted, reserved, and remaining seats instead of recomputing counts in each UI or API path.
- Parent and shared reads should stay session/RLS-scoped. Admin-wide reads need an explicit verified admin/service-role path.
- Parent class-request writes should use the server-side Supabase path and validate real student/class rows when the parent can already see that data in the UI.
- Parent student switching should be instant and non-blocking. Warm every parent student's profile and schedule plus student-specific parent routes in the background.

## Supabase And Cleanup

- Treat local behavior as production-like Supabase behavior, not as a special demo or fallback data layer.
- When debugging parent/admin dashboard differences, prove the data-access boundary from repo code, env shape without secrets, browser behavior, and Supabase/RLS evidence before patching UI symptoms.
- Do not combine broad cleanup/deletion with functional bug fixes. Before deleting scripts, migrations, seed files, docs, or generated-looking artifacts, verify they are not referenced by package scripts, README or ops docs, CI, deployment checks, Supabase history, or current QA workflows.

## Verification And Deploys

- Format school-facing history and schedule date behavior in `America/New_York`.
- Verify thin/mobile viewports when layout is involved.
- Do not leave intentional code/config/docs/instruction changes only local. For this CIA project, implementation is not complete until the intended changes are committed, pushed to `main`, Vercel production is Ready, and the relevant production smoke check has been run.
- Always perform GitHub operations for this repo with `gh auth switch -u dejoski`, then switch back to `gh auth switch -u Dejan-Stajic_dentsu` before ending the turn so the user's work account remains active.
- Keep generated or unrelated dirty files out of the commit unless explicitly required. If a requested change cannot be pushed and production-verified in the same turn, say exactly why before stopping.
- During active localhost iteration, default to scoped coding and scoped verification in the running app, then end the turn with an exact proof level and optional validation offer.
- Offer full lint/build/typecheck/browser/qa sweeps only when the user asks, when shared types or data boundaries changed, when work is moving toward push/deploy/issue closure, or when a focused check shows widening is the shortest safe next step.
- Do not call production fixed until local checks plus Vercel Ready/health are confirmed.
- This repo's deploy contract is Vercel-only: push to `main`, let Vercel build/deploy, and keep GitHub Actions workflow files out because inert workflow YAML creates false failed checks.
- For GitHub issue fixes, include proof artifacts in comments when practical: red/green screenshots for UI regressions, production alias checks, Vercel commit status, and temporary-row write/cleanup evidence.
- Treat fixing, pushing, commenting, and closing GitHub issues as separate steps. Do not close an app-facing issue unless the user explicitly authorized closure for that ticket or the relevant app/browser/production acceptance proof was checked. If the user asks to move fast with lighter proof, push and comment with the proof level, then leave the issue open for owner review.

## React Doctor

- Treat React Doctor full-project score and diff score as separate proof surfaces.
- Use a temporary npm cache if `npm exec` reports `ECOMPROMISED` or lock-compromised errors.
- Do not claim overall health from a clean diff score while the full-project backlog remains large.
- Treat `react-doctor --no-lint --no-dead-code` as executable-check proof only. Native `oxlint` or `oxc-parser` binding failures block full default-score proof until the default command runs successfully.
