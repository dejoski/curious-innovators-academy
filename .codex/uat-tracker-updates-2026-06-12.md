# CIA UAT Tracker Update Ledger - 2026-06-12

Source reviewed: `/tmp/cia-uat-tracker/CIA_SIS_Build.xlsx`, sheet `Task Tracker`.

Google Sheets status: the linked file is an Office `.xlsx`, so Sheets API edits fail with `FAILED_PRECONDITION`. Creating a native working copy through Drive import also failed with `403 Forbidden`. This ledger is the pushed tracker update surface until Drive permissions or a native Google Sheet are available.

## Counts From Source Snapshot

- Total tasks: 206
- Done: 83
- In progress: 4
- Not started: 87
- Needs Attention: 32
- Remaining before this pass: 123

## Coordinator-Accepted Code Updates

These rows now have code changes in this pass and should move at least to `Needs Attention` after merge/deploy, pending browser or owner UAT where noted.

| IDs | Spreadsheet rows | Tracker area | Status recommendation | Proof |
| --- | ---: | --- | --- | --- |
| 9-13, 89 | 10-14, 90 | Schedule state/finalization | Needs Attention | Added admin-only `PATCH /api/data/students/[id]/schedule`, admin schedule state selector, finalization guard usage, and focused route/client tests. Browser UAT still needed. |
| 91-103 | 92-104 | Class fields/lifecycle | Needs Attention | Class edit flows now persist block labels through schedule slot helpers and invalidate class/catalog/dashboard caches. Term/date selector still not proven. |
| 17-18 | 18-19 | Admin schedule alerts | Needs Attention | Dashboard system alerts now derive incomplete schedule and schedule-conflict alerts from schedule diagnostics. Browser UAT still needed. |
| 77-80, 83 | 78-81, 84 | Notification events subset | Needs Attention | Request submitted/approved/rejected/waitlisted notifications are wired from real write paths. Finalized/action-needed/capacity/conflict/waitlist-created events remain open. |
| 119 | 120 | Schedule filtering | Needs Attention | Admin schedule view now filters by student, class, teacher, block, status, and text query. Browser UAT still needed. |

## Rows With Existing Repo Evidence

These were marked `Not Started`, `Needs Attention`, or `In Progress` in the source tracker but have repo evidence and focused local proof. They should not be reassigned as unstarted.

| IDs | Spreadsheet rows | Recommended status | Evidence summary |
| --- | ---: | --- | --- |
| 1-2 | 2-3 | Done after deployment proof | Waitlist/full selection and pending reservation math are coded and covered by `scripts/test-capacity-waitlist-rules.cjs`. |
| 5, 121-122 | 6, 122-123 | Done after deployment proof | Parent enrichment browse/submit flow is coded and covered by parent catalog/capacity tests. |
| 7-8, 14 | 8-9, 15 | Done after deployment proof | Duplicate and student slot conflict guards exist in parent UI normalization and server write validation. |
| 15-16, 19, 104-107 | 16-17, 20, 105-108 | Done after deployment proof | Age, inactive/archive, approval-capacity, and permanent reservation guards exist in catalog/server code. Admin age override remains separate. |
| 23, 26-28, 30, 88, 101-103, 113-117, 120 | 24, 27-29, 31, 89, 102-104, 114-118, 121 | Done after deployment proof | Approval history, parent access/RLS, class lifecycle, approval filters/links, and login/RBAC have repo evidence. Some still need owner/browser review before closing tickets. |

## Still Real Work

- IDs 20-22 rows 21-23: schedule state writes now create audit events, but complete immutable history for every schedule edit path still needs production/browser proof.
- IDs 24-25 rows 25-26: historical class/schedule snapshots remain partial; current schedule state/audit evidence is not a full historical snapshot model.
- ID 118 row 119: teacher conflict detection is coded, but an explicit admin override record still needs product confirmation and proof.
- Notification rows for action-needed/incomplete schedule and conflict detected are currently dashboard alerts, not durable notification rows.

## Second Coordinator Pass - 2026-06-12

These updates were implemented after worker feedback and should be moved out of `Not Started` once this commit is merged, deployed, and smoke-checked.

| IDs | Spreadsheet rows | Tracker area | Status recommendation | Proof |
| --- | ---: | --- | --- | --- |
| 6 | 7 | Parent edit pending request | Done after deployment proof | Parent catalog can reopen a pending slot, keep pending choices selectable only for that slot, and submit with `submitScope: "slot"`. Covered by `scripts/test-parent-catalog-state.cjs`. |
| 20-22 | 21-23 | Schedule state audit | Needs Attention | Schedule state transitions now write non-blocking `student_schedule_state.update` audit events with actor, timestamp, state, semester, finalizer metadata. Covered by `scripts/test-student-schedule-state-route.cjs`. Full immutable history across all edit paths still needs proof. |
| 29 | 30 | Audit exportability | Needs Attention | Added admin-only `/api/data/audit-events` with JSON and CSV export. Covered by `scripts/test-audit-events-export.cjs` and auth guard checks. Broader export catalog still needs owner acceptance. |
| 77, 80, 81, 83 | 78, 81, 82, 84 | Notifications | Needs Attention | Waitlist-created/submitted, class capacity reached, request decisions, and schedule finalized notifications are wired to real write paths. Covered by `scripts/test-notification-event-plumbing.cjs` and `scripts/test-student-schedule-state-route.cjs`. Action-needed/conflict durable notifications remain dashboard-alert only. |
| 95, 100 | 96, 101 | Class term/date selection | Done after deployment proof | Create/edit class forms now load terms, default to current term, and send `semesterId`. Covered by `scripts/test-class-term-selector.cjs`. |
| 108 | 109 | Admin age override | Needs Attention | Admin-authenticated request creation can pass `allowAgeOverride`; server validates signed-in admin before bypassing age guard and audits override metadata. Covered by `scripts/test-admin-age-override.cjs`. Browser UX for surfacing the override still needs proof. |
| 109-112 | 110-113 | Core assignment by group/block/level | Needs Attention | Existing competency block mapping proof remains valid through `scripts/test-competency-block-mappings.cjs`; do not reassign as unstarted. Production UAT still needed. |
| 118 | 119 | Teacher conflict detection | Needs Attention | Schedule rows now get teacher conflict diagnostics across same daily slots/classes. Covered by `scripts/test-schedule-diagnostics.cjs`. Explicit override record is still open. |

Verification completed locally for this second pass:

- `node scripts/test-class-term-selector.cjs`
- `node scripts/test-admin-age-override.cjs`
- `node scripts/test-parent-catalog-state.cjs`
- `node scripts/test-audit-events-export.cjs`
- `node scripts/test-schedule-diagnostics.cjs`
- `node scripts/test-notification-event-plumbing.cjs`
- `node scripts/test-student-schedule-state-route.cjs`
- `node scripts/test-competency-block-mappings.cjs`
- `node scripts/test-capacity-waitlist-rules.cjs`
- `npm run check:api-auth-guards`
- `npm run check:sql-security`
- `npx react-doctor@latest --verbose --diff`
- `git diff --check`
- `npx tsc --noEmit`
- focused ESLint over touched TS/TSX files
- `npm run build`
