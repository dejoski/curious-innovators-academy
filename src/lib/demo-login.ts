/** Server/client importable demo bypass flag logic; storage writes only via client invokes. */
import {
  isDashboardPersona,
  type DashboardPersona,
} from "@/lib/dashboard/persona";

/**
 * Demo entry is available on localhost unless explicitly disabled. Production
 * can still opt in with NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true, but it stays off
 * by default away from local hosts.
 */
export function isDemoLoginUiEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN?.trim().toLowerCase();
  if (flag === "false") return false;
  if (flag === "true") return true;
  if (typeof window === "undefined") return process.env.NODE_ENV === "development";
  return isLocalDemoHost(window.location.hostname);
}

export const DEMO_UI_BYPASS_STORAGE_KEY = "cia-demo-ui-bypass";
export const DEMO_UI_ROLE_STORAGE_KEY = "cia-demo-ui-role";
export const DEMO_UI_ROLE_COOKIE_NAME = "cia-demo-role";

export function isLocalDemoHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function markDemoUiBypass(role?: DashboardPersona): void {
  try {
    window.localStorage.setItem(DEMO_UI_BYPASS_STORAGE_KEY, "1");
    if (role) {
      window.localStorage.setItem(DEMO_UI_ROLE_STORAGE_KEY, role);
      document.cookie = `${DEMO_UI_ROLE_COOKIE_NAME}=${role}; Path=/; Max-Age=604800; SameSite=Lax`;
    }
  } catch {
    /* ignore quota / SSR */
  }
}

export function clearDemoUiBypass(): void {
  try {
    window.localStorage.removeItem(DEMO_UI_BYPASS_STORAGE_KEY);
    window.localStorage.removeItem(DEMO_UI_ROLE_STORAGE_KEY);
    document.cookie = `${DEMO_UI_ROLE_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
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
