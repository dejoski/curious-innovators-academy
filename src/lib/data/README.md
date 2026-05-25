# Data access layer

Typed repository functions live in `src/lib/data/repositories/*` and read from Supabase with the cookie-aware server client when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set. Bundled fallback rows are for local/offline development. In production, set `NEXT_PUBLIC_REQUIRE_REMOTE_DATA=true` so missing env or failed queries return empty/unavailable data instead of silently showing sample rows.

## HTTP APIs (usable from client components or external clients)

When `**/page.tsx` files cannot be edited in a managed environment, call the same repositories through route handlers:

| Route | Payload |
| --- | --- |
| `GET /api/dashboard-presentation` | `{ metrics, dailyRows, fromRemote }` |
| `GET /api/data/students` | `{ students }` |
| `GET /api/data/students/:id/profile` | `{ profile, source }` |
| `GET /api/data/students/:id/schedule` | `{ rows, source }` |
| `GET /api/data/students/:id/roster` | `{ students, source }` |
| `GET /api/data/classes` | `{ classes }` |
| `GET /api/data/classes/:id/roster` | `{ students, source }` |
| `PATCH /api/data/classes/:id/roster` | `{ studentId, status }` updates enrollment status |
| `DELETE /api/data/classes/:id/roster?studentId=...` | removes one enrollment |
| `GET /api/data/invoices` | `{ invoices, source }` |
| `GET /api/data/notifications` | `{ notifications }` |
| `GET /api/data/schedule-extras` | `{ extrasByDate }` |

## Wiring the App Router pages

Some environments block automated edits to `src/**/page.tsx`. When you can edit them, prefer:

- **Dashboard (`src/app/dashboard/page.tsx`)** — replace the file with an async wrapper around `DashboardHomeResolved` exported from `src/components/dashboard-home.tsx`.
- **Client list pages** — `import { fetchStudents } from "@/lib/data/repositories/students"` (and siblings) inside a `useEffect` guarded by `isSupabaseConfigured()` from `src/lib/data/env.ts`, using the bundled fallbacks until the query succeeds.

Example dashboard page body:

```tsx
import { DashboardHomeResolved } from "@/components/dashboard-home";

export default async function Dashboard() {
  return <DashboardHomeResolved />;
}
```

## Primary wiring targets (manual integration where needed)

| Page | Repository | Remote tables (expected) |
| --- | --- | --- |
| `/dashboard` | `resolveDashboardPresentation` | `students`, `teachers`, `classes` with `track` in (`core`,`enrichment`) |
| `/dashboard/students` | `fetchStudents` | `students` |
| `/dashboard/classes` | `fetchClasses` | `classes` |
| `/dashboard/notifications` | `fetchNotifications` | `notifications` |
| `/dashboard/schedule` | `fetchScheduleExtrasByDate` + shared weekday seed | `schedule_events` |
| `/dashboard/parents/billing` | `fetchInvoicesResolved` | `invoices` |

## Repository stubs (mock until tables exist)

| Function | Fallback | Table name (when ready) |
| --- | --- | --- |
| `fetchTeachers` | `TEACHERS_FALLBACK` | `teachers` |
| `fetchParents` | `PARENTS_FALLBACK` | `parents` |
| `fetchEnrichmentRequests` | `REQUESTS_FALLBACK` | `enrichment_requests` |
| `fetchStudentNotes` | empty | `student_records` |
| `fetchFeedbackSubmissions` | empty | `feedback` |

## Column mapping (guidance)

Repositories map common names (e.g. `full_name` or `name`, `avatar_url` or `avatar`). Align your Supabase schema to these conventions or adjust the mapper in the relevant repository file.

### `classes` (dashboard counts)

`track` must be `core` or `enrichment` for the four head counts to succeed together. If the column is absent, dashboard stats fall back to `DASHBOARD_METRICS` in `src/lib/dashboard-metrics.ts`.

`class_catalog_availability` is the database-owned view for enrolled, pending, waitlisted, reserved, and remaining seat counts. Parent catalog and class list reads should use that view instead of recomputing availability in each UI surface.

### `schedule_events`

Expected fields: ISO date (`event_date` or `date`), `time_label`, `title`, optional `description`, `event_type` matching `CalendarEventType` (`core`, `enrichment-pending`, `enrichment-approved`, `event`).

## Pages still using local UI constants

Remaining constants are UI option sets or forms rather than school sample records:

- `dashboard/support` help categories
- `dashboard/parents/feedback` form chips and NPS scale
- `dashboard/students/new` grade-level choices

School content for classes, rosters, profiles, schedule rows, parents, teachers, requests, notifications, and parent/student history now routes through repositories, API handlers, or dedicated data modules.
