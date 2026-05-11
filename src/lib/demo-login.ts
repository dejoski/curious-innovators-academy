/** Server/client importable demo bypass flag logic; storage writes only via client invokes. */

/** When `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` is unset or empty, bypass UI stays available. Set strictly to `"false"` to hide login + suppress stored bypass banners. */
export function isDemoLoginUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN !== "false";
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
