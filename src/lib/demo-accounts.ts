/**
 * Concrete demo accounts for QA / Figma flow parity. Used only when
 * `NEXT_PUBLIC_ENABLE_TEST_PERSONA_UI=true`.
 */

export type DashboardPersona = "admin" | "parent" | "teacher" | "student";

export const DEMO_STATE_STORAGE_KEY = "cia-demo-dashboard-state";
export const LEGACY_PERSONA_STORAGE_KEY = "cia-dashboard-persona";

export type DemoAccountId =
  | "admin-joseph"
  | "admin-dejan"
  | "parent-mary"
  | "teacher-emily"
  | "student-anna";

export type DemoAccount = {
  id: DemoAccountId;
  persona: DashboardPersona;
  displayName: string;
  roleLabel: string;
  defaultRoute: string;
  /** Student profile segment when persona is `student` */
  studentId: string;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "admin-joseph",
    persona: "admin",
    displayName: "Joseph Collins",
    roleLabel: "Administrator",
    defaultRoute: "/dashboard",
    studentId: "1",
  },
  {
    id: "admin-dejan",
    persona: "admin",
    displayName: "Dejan Stajić",
    roleLabel: "Administrator",
    defaultRoute: "/dashboard",
    studentId: "1",
  },
  {
    id: "parent-mary",
    persona: "parent",
    displayName: "Mary Lee",
    roleLabel: "Parent",
    defaultRoute: "/dashboard/parents/students",
    studentId: "1",
  },
  {
    id: "teacher-emily",
    persona: "teacher",
    displayName: "Emily Carter",
    roleLabel: "Teacher",
    defaultRoute: "/dashboard/teachers",
    studentId: "1",
  },
  {
    id: "student-anna",
    persona: "student",
    displayName: "Anna Lee",
    roleLabel: "Student",
    defaultRoute: "/dashboard/students/1",
    studentId: "1",
  },
];

export const DEFAULT_DEMO_ACCOUNT_ID: DemoAccountId = "admin-joseph";

export function getDemoAccountById(id: string | null | undefined): DemoAccount {
  const found = DEMO_ACCOUNTS.find((a) => a.id === id);
  return found ?? DEMO_ACCOUNTS[0]!;
}

export function defaultDemoAccountIdForPersona(persona: DashboardPersona): DemoAccountId {
  switch (persona) {
    case "admin":
      return "admin-joseph";
    case "parent":
      return "parent-mary";
    case "teacher":
      return "teacher-emily";
    case "student":
      return "student-anna";
  }
}

export function isDemoAccountId(value: string): value is DemoAccountId {
  return DEMO_ACCOUNTS.some((a) => a.id === value);
}

/** Two-letter avatar label from a display name */
export function initialsFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
}

/**
 * Direct links for common Figma review paths (admin shell). Opening these from
 * Settings switches to an admin demo account so the sidebar matches.
 */
export type DemoFigmaFlowLink = {
  id: string;
  label: string;
  href: string;
  /** Copy for QA panel */
  figmaNote?: string;
};

export const DEMO_FIGMA_FLOW_LINKS: DemoFigmaFlowLink[] = [
  {
    id: "flow-1",
    label: "Flow 1 — Dashboard",
    href: "/dashboard",
    figmaNote: "Dashboard (primary) · node 6:3",
  },
  {
    id: "flow-3",
    label: "Flow 3 — Schedule",
    href: "/dashboard/schedule",
    figmaNote: "Schedule — Month · node 313:2892",
  },
  {
    id: "flow-4",
    label: "Flow 4 — Students",
    href: "/dashboard/students",
    figmaNote: "Students — List · node 250:4247",
  },
  {
    id: "parents-list",
    label: "Parents list",
    href: "/dashboard/parents",
    figmaNote: "Parents — Parent List · node 376:3883",
  },
];

type DemoStateV1 = { v: 1; accountId: DemoAccountId };

export function parseDemoStateJson(raw: string | null): DemoAccountId | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DemoStateV1>;
    if (parsed?.v === 1 && parsed.accountId && isDemoAccountId(parsed.accountId)) {
      return parsed.accountId;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function serializeDemoState(accountId: DemoAccountId): string {
  const payload: DemoStateV1 = { v: 1, accountId };
  return JSON.stringify(payload);
}
