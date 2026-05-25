"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { preloadParentDashboardData } from "@/lib/client-data-cache";
import { PARENT_SCHEDULE_HREF } from "@/lib/dashboard/parent-schedule-route";
import { withParentStudentParam } from "@/lib/parent-student-selection";

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
    let cancelled = false;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

    function prefetchRoutes(studentIds: string[]) {
      for (const route of PARENT_PREFETCH_ROUTES) {
        router.prefetch(route);
        for (const studentId of studentIds) {
          router.prefetch(withParentStudentParam(route, studentId));
        }
      }
    }

    async function warm(attempt = 0) {
      const result = await preloadParentDashboardData();
      if (cancelled) return;
      prefetchRoutes(result.studentIds);
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
  }, [pathname, router]);

  return null;
}
