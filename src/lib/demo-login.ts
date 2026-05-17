/** Server/client importable demo bypass flag logic; storage writes only via client invokes. */
import { isRemoteDataRequired } from "@/lib/data/env";

/**
 * When `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` is unset or empty, bypass UI stays available
 * for local demos. Production remote-data mode always disables the bypass.
 */
export function isDemoLoginUiEnabled(): boolean {
  if (isRemoteDataRequired()) return false;
  return process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN?.trim() !== "false";
}

export const DEMO_UI_BYPASS_STORAGE_KEY = "cia-demo-ui-bypass";

export function markDemoUiBypass(): void {
  try {
    window.localStorage.setItem(DEMO_UI_BYPASS_STORAGE_KEY, "1");
  } catch {
    /* ignore quota / SSR */
  }
}

export function clearDemoUiBypass(): void {
  try {
    window.localStorage.removeItem(DEMO_UI_BYPASS_STORAGE_KEY);
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
