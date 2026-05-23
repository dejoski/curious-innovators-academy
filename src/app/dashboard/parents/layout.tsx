"use client";

import React, { useEffect } from "react";

import { useDashboardPersona } from "@/components/dashboard-persona";
import { preloadParentDashboardData } from "@/lib/client-data-cache";
import { isTestPersonaSwitcherEnabled } from "@/lib/product-ui-flags";

/**
 * Parent dashboard routes use the parent shell in the sidebar/header. When the QA
 * persona switcher is enabled, entering this subtree aligns storage with Parent so
 * the preview control matches what is on screen.
 */
export default function ParentsDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setPersona } = useDashboardPersona();

  useEffect(() => {
    if (!isTestPersonaSwitcherEnabled()) return;
    setPersona("parent");
  }, [setPersona]);

  useEffect(() => {
    void preloadParentDashboardData();
  }, []);

  return <>{children}</>;
}
