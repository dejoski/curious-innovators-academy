import {
  DEMO_STATE_STORAGE_KEY,
  LEGACY_PERSONA_STORAGE_KEY,
  serializeDemoState,
  type DemoAccountId,
} from "@/lib/demo-accounts";
import { markDemoUiBypass } from "@/lib/demo-login";
import { isTestPersonaSwitcherEnabled } from "@/lib/product-ui-flags";

/** Primary demo entry for staff / admin shell */
export const DEMO_ADMIN_START_ROUTE = "/dashboard";

/** Flow 2 parent student profile area */
export const DEMO_PARENT_START_ROUTE = "/dashboard/parents/students";

const DEMO_ACCOUNT_BY_KIND: Record<"admin" | "parent", DemoAccountId> = {
  admin: "admin-joseph",
  parent: "parent-mary",
};

/**
 * Marks the demo UI bypass and, when test persona storage is enabled, persists the
 * demo account for Admin or Parent before navigating from the login screen.
 */
export function bootstrapDemoSession(kind: "admin" | "parent"): string {
  markDemoUiBypass();
  if (typeof window !== "undefined" && isTestPersonaSwitcherEnabled()) {
    try {
      const id = DEMO_ACCOUNT_BY_KIND[kind];
      window.localStorage.setItem(DEMO_STATE_STORAGE_KEY, serializeDemoState(id));
      window.localStorage.removeItem(LEGACY_PERSONA_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  return kind === "admin" ? DEMO_ADMIN_START_ROUTE : DEMO_PARENT_START_ROUTE;
}
