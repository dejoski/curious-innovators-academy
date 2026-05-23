/** Server/client importable demo bypass flag logic; storage writes only via client invokes. */
import { isRemoteDataRequired } from "@/lib/data/env";
import type { DashboardPersona } from "@/lib/demo-accounts";

/**
 * When `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` is unset or empty, bypass UI stays available
 * for local demos. Production remote-data mode always disables the bypass.
 */
export function isDemoLoginUiEnabled(): boolean {
  if (isRemoteDataRequired()) return false;
  return process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN?.trim() !== "false";
}

export const DEMO_UI_BYPASS_STORAGE_KEY = "cia-demo-ui-bypass";
export const DEMO_UI_ROLE_STORAGE_KEY = "cia-demo-ui-role";

function isDashboardPersona(value: string | null): value is DashboardPersona {
  return value === "admin" || value === "parent" || value === "teacher" || value === "student";
}

export function markDemoUiBypass(role?: DashboardPersona): void {
  try {
    window.localStorage.setItem(DEMO_UI_BYPASS_STORAGE_KEY, "1");
    if (role) window.localStorage.setItem(DEMO_UI_ROLE_STORAGE_KEY, role);
  } catch {
    /* ignore quota / SSR */
  }
}

export function clearDemoUiBypass(): void {
  try {
    window.localStorage.removeItem(DEMO_UI_BYPASS_STORAGE_KEY);
    window.localStorage.removeItem(DEMO_UI_ROLE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function isDemoUiBypassStored(): boolean {
  try {
    return window.localStorage.getItem(DEMO_UI_BYPASS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function readDemoUiBypassRole(): DashboardPersona | null {
  try {
    if (!isDemoUiBypassStored()) return null;
    const role = window.localStorage.getItem(DEMO_UI_ROLE_STORAGE_KEY);
    return isDashboardPersona(role) ? role : null;
  } catch {
    return null;
  }
}
