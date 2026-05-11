import type { DashboardPersona } from "@/components/dashboard-persona";
import { PARENT_SCHEDULE_HREF } from "@/lib/dashboard/parent-schedule-route";

/**
 * Maps QA product flows to app routes and the dashboard persona preview to use when
 * `NEXT_PUBLIC_ENABLE_TEST_PERSONA_UI=true` (see `dashboard-persona.tsx`, key `cia-dashboard-persona`).
 * Figma refs align with prototype node IDs shared for reviews.
 *
 * If a centralized `demo-accounts` helper is introduced later: call its account-picker from the
 * same launch handler as `setPersona` (switch preview + optional stored bypass), then `router.push(route)`.
 */
export type QaFlowLauncherEntry = {
  id: string;
  flowName: string;
  /** Figma node id (file-local), for traceability only */
  figmaNodeId: string;
  figmaTitle: string;
  route: string;
  persona: DashboardPersona;
};

export const QA_FLOW_LAUNCHERS: QaFlowLauncherEntry[] = [
  {
    id: "flow-1",
    flowName: "Flow 1 — Core classes list",
    figmaNodeId: "125:443",
    figmaTitle: "Classes / Classes List - Core",
    route: "/dashboard/classes/core",
    persona: "admin",
  },
  {
    id: "flow-2",
    flowName: "Flow 2 — Parent student profile",
    figmaNodeId: "188:3969",
    figmaTitle: "Parent · Students / Profile",
    route: "/dashboard/parents/students",
    persona: "parent",
  },
  {
    id: "flow-parent-schedule",
    flowName: "Parent — Schedule (parent shell)",
    figmaNodeId: "313:2892",
    figmaTitle: "Parent dashboard · Schedule (scoped route)",
    route: PARENT_SCHEDULE_HREF,
    persona: "parent",
  },
  {
    id: "flow-3",
    flowName: "Flow 3 — Class approvals history",
    figmaNodeId: "250:3042",
    figmaTitle: "Classes / Approval History",
    route: "/dashboard/classes/approvals",
    persona: "admin",
  },
  {
    id: "flow-4",
    flowName: "Flow 4 — Parents directory",
    figmaNodeId: "376:3883",
    figmaTitle: "Parents / Parent List",
    route: "/dashboard/parents",
    persona: "admin",
  },
];
