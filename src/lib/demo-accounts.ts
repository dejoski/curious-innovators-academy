/** Concrete demo accounts used only when `NEXT_PUBLIC_ENABLE_TEST_PERSONA_UI=true`. */
import {
  DEFAULT_DEMO_ACCOUNT_ID,
  DEMO_ACCOUNTS,
} from "@/lib/data/mock/demo-accounts";
import type { DashboardPersona } from "@/lib/dashboard/persona";

export type { DashboardPersona } from "@/lib/dashboard/persona";

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

export { DEFAULT_DEMO_ACCOUNT_ID, DEMO_ACCOUNTS };

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
