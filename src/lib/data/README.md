# Data access layer

Typed repository functions live in `src/lib/data/repositories/*` and read from Supabase when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set. **If either is missing or a query fails, the bundled mock fallbacks keep the deployed demo usable without a database.**

REST access uses `src/lib/supabase/rest.ts` (no extra runtime dependency).

## HTTP APIs (usable from client components or external clients)

When `**/page.tsx` files cannot be edited in a managed environment, call the same repositories through route handlers:

| Route | Payload |
| --- | --- |
| `GET /api/dashboard-presentation` | `{ metrics, dailyRows, fromRemote }` |
| `GET /api/data/students` | `{ students }` |
| `GET /api/data/classes` | `{ classes }` |
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

## Repository stubs (mock until tables exist)

| Function | Fallback | Table name (when ready) |
| --- | --- | --- |
| `fetchTeachers` | `TEACHERS_FALLBACK` | `teachers` |
| `fetchParents` | `PARENTS_FALLBACK` | `parents` |
| `fetchEnrichmentRequests` | `REQUESTS_FALLBACK` | `enrichment_requests` |
| `fetchStudentNotes` | empty | `student_notes` |
| `fetchFeedbackSubmissions` | empty | `feedback_submissions` |

## Column mapping (guidance)

Repositories map common names (e.g. `full_name` or `name`, `avatar_url` or `avatar`). Align your Supabase schema to these conventions or adjust the mapper in the relevant repository file.

### `classes` (dashboard counts)

`track` must be `core` or `enrichment` for the four head counts to succeed together. If the column is absent, dashboard stats fall back to `DASHBOARD_METRICS` in `src/lib/dashboard-metrics.ts`.

### `schedule_events`

Expected fields: ISO date (`event_date` or `date`), `time_label`, `title`, optional `description`, `event_type` matching `CalendarEventType` (`core`, `enrichment-pending`, `enrichment-approved`, `event`).

## Pages still using local state / inline mocks

Not yet switched to repositories in this pass (non-exhaustive):

- `dashboard/teachers`, `dashboard/teachers/[id]` (lists / profile)
- `dashboard/classes/core/*`, `dashboard/classes/enrichment/*`, class rosters, detail pages
- `dashboard/classes/requests`, `dashboard/classes/approvals`
- `dashboard/parents/**` (catalog, class lists, feedback form)
- `dashboard/students/[id]/*` (profile, schedule duplicate, roster)
- `dashboard/support`, settings, messaging, login flows

These can import the same mocks or call `fetch*` functions as tables are introduced.
