"use client";

import React, { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useDashboardPersona } from "@/components/dashboard-persona";
import { dashboardRedirectForPersona } from "@/lib/dashboard/role-routes";

function RouteGuardFallback({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-[#fafafa] p-8 font-sans">
      <div className="rounded-[12px] border border-[#e6e8ee] bg-white px-5 py-4 text-sm font-medium text-[#525a6a] shadow-sm">
        {label}
      </div>
    </div>
  );
}

export default function DashboardRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { persona, demoStudentId, isAccountResolved } = useDashboardPersona();

  const redirectTarget = useMemo(() => {
    if (!isAccountResolved) return null;
    return dashboardRedirectForPersona(pathname, persona, demoStudentId);
  }, [demoStudentId, isAccountResolved, pathname, persona]);

  useEffect(() => {
    if (redirectTarget) router.replace(redirectTarget);
  }, [redirectTarget, router]);

  if (!isAccountResolved) return <RouteGuardFallback label="Loading dashboard..." />;
  if (redirectTarget) return <RouteGuardFallback label="Redirecting..." />;

  return <>{children}</>;
}
