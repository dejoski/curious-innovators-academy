"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useDashboardPersona } from "@/components/dashboard-persona";
import { preloadParentDashboardData } from "@/lib/client-data-cache";

export default function ParentDashboardPreloader() {
  const pathname = usePathname() ?? "";
  const { isAccountResolved, persona } = useDashboardPersona();

  useEffect(() => {
    if (!isAccountResolved || persona !== "parent" || !pathname.startsWith("/dashboard/parents")) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

    async function warm(attempt = 0) {
      const result = await preloadParentDashboardData();
      if (cancelled) return;
      if (!result.ok && attempt < 3) {
        timeoutId = globalThis.setTimeout(() => {
          void warm(attempt + 1);
        }, 1500 * (attempt + 1));
      }
    }

    void warm();
    return () => {
      cancelled = true;
      if (timeoutId) globalThis.clearTimeout(timeoutId);
    };
  }, [isAccountResolved, pathname, persona]);

  return null;
}
