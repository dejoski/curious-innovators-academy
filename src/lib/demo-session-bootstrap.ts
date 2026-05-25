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

/** Primary parent dashboard shell */
export const DEMO_PARENT_START_ROUTE = "/dashboard/parents/home";

const DEMO_ACCOUNT_BY_KIND: Record<"admin" | "parent", DemoAccountId> = {
  admin: "admin-joseph",
  parent: "parent-mary",
};

/**
 * Marks the demo UI bypass and persists the chosen role before navigating from
 * the login screen. The role is separate from the QA persona switcher so demo
 * Parent cannot accidentally fall back to the admin shell.
 */
export function bootstrapDemoSession(kind: "admin" | "parent"): string {
  markDemoUiBypass(kind);
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
