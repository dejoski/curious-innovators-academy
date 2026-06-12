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

- ID 6 row 7: parent edit of an already pending request.
- IDs 20-22 rows 21-23: complete immutable schedule-change audit history.
- IDs 24-25 rows 25-26: historical class/schedule snapshots.
- ID 29 row 30: full data exportability beyond current partial CSV exports.
- IDs 95 and 100 rows 96 and 101: explicit term/date selection.
- ID 108 row 109: admin override of age rule.
- IDs 109-112 rows 110-113: core assignment by block/group/level remains only partially proven.
- ID 118 row 119: teacher conflict detection/override record.
- Remaining notification rows: finalized, action-needed, capacity, conflict, and waitlist-created notifications.
