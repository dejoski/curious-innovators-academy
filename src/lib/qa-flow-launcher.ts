import type { DashboardPersona } from "@/components/dashboard-persona";
import { PARENT_SCHEDULE_HREF } from "@/lib/dashboard/parent-schedule-route";

/**
 * Maps QA product flows to app routes and the dashboard persona preview to use when
 * `NEXT_PUBLIC_ENABLE_TEST_PERSONA_UI=true` (see `dashboard-persona.tsx`, key `cia-dashboard-persona`).
 */
export type QaFlowLauncherEntry = {
  id: string;
  flowName: string;
  route: string;
  persona: DashboardPersona;
};

export const QA_FLOW_LAUNCHERS: QaFlowLauncherEntry[] = [
  {
    id: "flow-1",
    flowName: "Flow 1 — Core classes list",
    route: "/dashboard/classes/core",
    persona: "admin",
  },
  {
    id: "flow-2",
    flowName: "Flow 2 — Parent student profile",
    route: "/dashboard/parents/students",
    persona: "parent",
  },
  {
    id: "flow-parent-schedule",
    flowName: "Parent — Schedule (parent shell)",
    route: PARENT_SCHEDULE_HREF,
    persona: "parent",
  },
  {
    id: "flow-3",
    flowName: "Flow 3 — Class approvals history",
    route: "/dashboard/classes/approvals",
    persona: "admin",
  },
  {
    id: "flow-4",
    flowName: "Flow 4 — Parents directory",
    route: "/dashboard/parents",
    persona: "admin",
  },
];
