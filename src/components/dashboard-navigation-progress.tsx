"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";

type DashboardNavigationProgressValue = {
  pendingPath: string | null;
  startNavigation: (path: string) => void;
};

const DashboardNavigationProgressContext =
  React.createContext<DashboardNavigationProgressValue | null>(null);

const DASHBOARD_PREFETCH_ROUTES = [
  "/dashboard",
  "/dashboard/schedule",
  "/dashboard/classes/core",
  "/dashboard/classes/requests",
  "/dashboard/classes/approvals",
  "/dashboard/students",
  "/dashboard/students/schedule",
  "/dashboard/students/roster",
  "/dashboard/parents",
  "/dashboard/teachers",
  "/dashboard/settings",
];

export function DashboardNavigationProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pendingPath, setPendingPath] = React.useState<string | null>(null);
  const pathname = usePathname() ?? "";
  const router = useRouter();

  React.useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  React.useEffect(() => {
    for (const route of DASHBOARD_PREFETCH_ROUTES) {
      router.prefetch(route);
    }
  }, [router]);

  const value = React.useMemo(
    () => ({
      pendingPath,
      startNavigation: (path: string) => {
        if (path !== pathname) setPendingPath(path);
      },
    }),
    [pathname, pendingPath],
  );

  return (
    <DashboardNavigationProgressContext.Provider value={value}>
      {children}
    </DashboardNavigationProgressContext.Provider>
  );
}

export function useDashboardNavigationProgress() {
  const value = React.useContext(DashboardNavigationProgressContext);
  if (!value) {
    throw new Error("useDashboardNavigationProgress must be used within DashboardNavigationProgressProvider");
  }
  return value;
}

export function DashboardNavigationOverlay() {
  const { pendingPath } = useDashboardNavigationProgress();
  const [showSpinner, setShowSpinner] = React.useState(false);

  React.useEffect(() => {
    if (!pendingPath) {
      setShowSpinner(false);
      return;
    }

    const timer = window.setTimeout(() => setShowSpinner(true), 120);
    return () => window.clearTimeout(timer);
  }, [pendingPath]);

  if (!pendingPath) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 bg-white/45 backdrop-blur-[1px]" aria-live="polite" aria-busy="true">
      <div className="absolute left-0 top-0 h-[2px] w-full overflow-hidden bg-[#d2f1f5]">
        <div className="h-full w-1/3 animate-[dashboard-progress_0.9s_ease-in-out_infinite] bg-[#14c1d5]" />
      </div>
      {showSpinner ? (
        <div className="absolute left-1/2 top-8 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#e7eef0] bg-white px-3 py-2 shadow-sm">
          <span className="size-4 animate-spin rounded-full border-2 border-[#d2f1f5] border-t-[#14c1d5]" />
          <span className="text-sm font-medium text-[#272932]">Loading</span>
        </div>
      ) : null}
    </div>
  );
}
