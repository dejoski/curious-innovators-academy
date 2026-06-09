import type { DashboardPersona } from "@/lib/dashboard/persona";

export type { DashboardPersona } from "@/lib/dashboard/persona";

export const DEMO_STATE_STORAGE_KEY = "cia-demo-dashboard-state";
export const LEGACY_PERSONA_STORAGE_KEY = "cia-dashboard-persona";

export type DemoAccountId = string;

export type DemoAccount = {
  id: DemoAccountId;
  persona: DashboardPersona;
  displayName: string;
  roleLabel: string;
  defaultRoute: string;
  /** Student profile segment when persona is `student` */
  studentId: string;
};

function buildDemoAccounts() {
  const accounts: DemoAccount[] = [];
  const configs: { id: string; persona: DashboardPersona; name: string; route: string }[] = [
    { id: "admin-primary", persona: "admin", name: "Admin preview", route: "/dashboard" },
    { id: "admin-secondary", persona: "admin", name: "Admin preview 2", route: "/dashboard" },
    { id: "parent-primary", persona: "parent", name: "Parent preview", route: "/dashboard/parents/home" },
    { id: "teacher-primary", persona: "teacher", name: "Teacher preview", route: "/dashboard/teachers" },
    { id: "student-primary", persona: "student", name: "Student preview", route: "/dashboard/students" },
  ];
  for (const c of configs) {
    accounts.push({ id: c.id, persona: c.persona, displayName: c.name, roleLabel: c.persona.charAt(0).toUpperCase() + c.persona.slice(1), defaultRoute: c.route, studentId: "" });
  }
  return accounts;
}

export const DEMO_ACCOUNTS = buildDemoAccounts();

export const DEFAULT_DEMO_ACCOUNT_ID: DemoAccountId = "admin-primary";

export function getDemoAccountById(id: string | null | undefined): DemoAccount {
  return DEMO_ACCOUNTS.find((a) => a.id === id) ?? DEMO_ACCOUNTS[0]!;
}

export function defaultDemoAccountIdForPersona(persona: DashboardPersona): DemoAccountId {
  return `${persona}-primary`;
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
