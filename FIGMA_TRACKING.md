# Figma Screen Integration Tracker

Tracks top-level screens from Figma versus Next.js routes under `src/app`.

**Progress:** ~28 / 34 screens routed or covered by intentional UI state (~82%). See `FIGMA_PARITY_TODO.md` for deferred node IDs where layout detail is pending.

---

## Admin dashboard

| Screen (Figma label) | Node ID | Application route |
| --- | --- | --- |
| Class Setup (all tracks) | (see tabs in design) | `src/app/dashboard/classes/page.tsx` |
| Classes List — Core | `125:443` | `src/app/dashboard/classes/core/page.tsx` |
| Classes List — Enrichment | `363:7091` | `src/app/dashboard/classes/enrichment/page.tsx` |
| Add Class | `363:3524` | `src/app/dashboard/classes/new/page.tsx` (`?track=core\|enrichment`) |
| Edit Class | `363:4181` | `src/app/dashboard/classes/edit/[segment]/[id]/page.tsx` |
| Classes / Core (detail) | `130:3681`, `377:8572` | `src/app/dashboard/classes/core/[id]/page.tsx` |
| Classes / Enrichment (detail) | `131:4392` | `src/app/dashboard/classes/enrichment/[id]/page.tsx` |
| Approval History | `250:3042` | `src/app/dashboard/classes/approvals/page.tsx` |
| Enrichment requests | `246:3565` | `src/app/dashboard/classes/requests/page.tsx` |
| Classes List — **Check** | `363:7833` | *Deferred — see `FIGMA_PARITY_TODO.md`* |
| Approval History (**row selected**) | `250:3477` | *Deferred — selection/detail state* |
| Enrichment requests (**row selected**) | `246:4974` | *Deferred — selection/detail state* |
| Dashboard (primary) | `6:3` | `src/app/dashboard/page.tsx` |
| Dashboard (alternate composition) | `516:1455` | *Deferred — see `FIGMA_PARITY_TODO.md`* |
| Parents — Parent List | `376:3883` | `src/app/dashboard/parents/page.tsx` |
| Schedule — Month | `313:2892` | `src/app/dashboard/schedule/page.tsx` (default view) |
| Schedule — Week | `434:1207` | Same page: `/dashboard/schedule?view=week` |
| Schedule — Day | `434:1721` | Same page: `/dashboard/schedule?view=day` |
| Students — Students List | `250:4247` | `src/app/dashboard/students/page.tsx` |
| Student — Add Student | `350:4109` | `src/app/dashboard/students/new/page.tsx` |
| Student — Edit Student | `363:3098` | *Deferred — no PATCH student API yet; see parity TODO* |
| Students — Schedule | `350:3720`, `383:10077` | `src/app/dashboard/students/[id]/schedule/page.tsx` *(alt variant: TODO parity)* |
| Students — View Profile | `378:8926` | `src/app/dashboard/students/[id]/page.tsx` |
| Student / Class Roster | `292:2971` | `src/app/dashboard/classes/[id]/roster/page.tsx` |
| Student / Student Roster | `315:5635` | `src/app/dashboard/students/[id]/roster/page.tsx` |
| Teachers — Teacher List | `376:4794` | `src/app/dashboard/teachers/page.tsx` |
| Teacher — Create teacher | `377:5261` | `src/app/dashboard/teachers/new/page.tsx` |

**Also present (product / shell, not listed as separate Figma “screens” in the source list):**

- `src/app/dashboard/settings/page.tsx`
- `src/app/dashboard/notifications/page.tsx`
- `src/app/dashboard/support/page.tsx`

---

## Parent dashboard

| Screen | Node ID | Route |
| --- | --- | --- |
| Parent — Classes Core | `188:3532` | `src/app/dashboard/parents/classes/core/page.tsx` |
| Parent — Classes Enrichment | `237:2374` | `src/app/dashboard/parents/classes/enrichment/page.tsx` |
| Parent — Enrichment Catalog | `314:4014` | `src/app/dashboard/parents/catalog/page.tsx` |
| Parent — Students / Profile | `188:3969` | `src/app/dashboard/parents/students/page.tsx` |
| Parent — Feedback | `378:9306` | `src/app/dashboard/parents/feedback/page.tsx` |

---

## Authentication / other

| Screen | Node ID | Route |
| --- | --- | --- |
| Login | `13:498` | `src/app/login/page.tsx` |
