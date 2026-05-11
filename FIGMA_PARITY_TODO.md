# Figma parity — explicit TODOs

Use this file when a screen is **not** fully reproduced in code and pulling exact layout/components from Figma requires the nodes below.

## Deferred screens / states

1. **Classes List — Check** — Node ID: `363:7833`  
   - Intended: roster / attendance “check” style list (distinct from Core list).  
   - Action: Inspect node in file; decide if this maps to `/dashboard/classes/check` vs extending `classes/core` with a filter; implement after spec is confirmed.

2. **Dashboard (alternate)** — Node ID: `516:1455`  
   - Distinct dashboard composition from primary `6:3`. Action: Diff against `/dashboard`; add route or configurable section only once layout/widgets are extracted from Figma.

3. **Student — Edit Student** — Node ID: `363:3098`  
   - Blockers: `/api/data/students` has POST/DELETE only; no `PATCH` / `serverUpdateStudent`. Action: Add write path + `/dashboard/students/[id]/edit` (or align “Edit profile” entry to that route).

4. **Students Schedule (alternate)** — Node ID: `383:10077`  
   - Primary route: `/dashboard/students/[id]/schedule`. Action: Compare `383:10077` vs built page; extend client or query variant only if layouts diverge materially.

5. **Approval History — selected row UI** — Node ID: `250:3477`  
   - Likely selection/detail state rather than mandatory URL. Optional: `/dashboard/classes/approvals?detail=<id>` when product needs bookmarking.

6. **Enrichment requests — selected row UI** — Node ID: `246:4974`  
   - Same pattern as approvals; optional query param route if required for deep linking.
