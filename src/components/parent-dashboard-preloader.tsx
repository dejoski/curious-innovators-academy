"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { preloadParentDashboardData } from "@/lib/client-data-cache";
import { PARENT_SCHEDULE_HREF } from "@/lib/dashboard/parent-schedule-route";

const PARENT_PREFETCH_ROUTES = [
  "/dashboard/parents/home",
  PARENT_SCHEDULE_HREF,
  "/dashboard/parents/catalog",
  "/dashboard/parents/classes/core",
  "/dashboard/parents/classes/enrichment",
  "/dashboard/parents/students",
] as const;

export default function ParentDashboardPreloader() {
  const pathname = usePathname() ?? "";
  const router = useRouter();

  useEffect(() => {
    if (!pathname.startsWith("/dashboard/parents")) return;

    const warm = () => {
      void preloadParentDashboardData();
      for (const route of PARENT_PREFETCH_ROUTES) router.prefetch(route);
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(warm, { timeout: 900 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(warm, 120);
    return () => globalThis.clearTimeout(timeoutId);
  }, [pathname, router]);

  return null;
}
