"use client";

import React, { useEffect } from "react";

import { preloadParentDashboardData } from "@/lib/client-data-cache";

export default function ParentsDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    void preloadParentDashboardData();
  }, []);

  return <>{children}</>;
}
