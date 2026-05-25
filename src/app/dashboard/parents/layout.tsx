"use client";

import React, { useEffect } from "react";

import { useDashboardPersona } from "@/components/dashboard-persona";
import { preloadParentDashboardData } from "@/lib/client-data-cache";

export default function ParentsDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAccountResolved, persona } = useDashboardPersona();

  useEffect(() => {
    if (!isAccountResolved || persona !== "parent") return;
    void preloadParentDashboardData();
  }, [isAccountResolved, persona]);

  return <>{children}</>;
}
