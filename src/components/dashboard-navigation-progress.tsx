"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { DASHBOARD_WORKSPACE_EVENT } from "@/lib/dashboard/workspace";

type DashboardNavigationProgressValue = {
  pendingPath: string | null;
  startNavigation: (path: string) => void;
};

const DashboardNavigationProgressContext =
  React.createContext<DashboardNavigationProgressValue | null>(null);

export function DashboardNavigationProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pendingPath, setPendingPath] = React.useState<string | null>(null);
  const pathname = usePathname() ?? "";

  React.useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  React.useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
      let next: URL;
      try {
        next = new URL(anchor.href);
      } catch {
        return;
      }
      if (next.origin !== window.location.origin || !next.pathname.startsWith("/dashboard")) return;
      if (`${next.pathname}${next.search}` === `${window.location.pathname}${window.location.search}`) return;
      setPendingPath(next.pathname);
    }

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener(DASHBOARD_WORKSPACE_EVENT, clearPending);
    window.addEventListener("cia-classes-workspace-view", clearPending);
    window.addEventListener("popstate", clearPending);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener(DASHBOARD_WORKSPACE_EVENT, clearPending);
      window.removeEventListener("cia-classes-workspace-view", clearPending);
      window.removeEventListener("popstate", clearPending);
    };

    function clearPending() {
      setPendingPath(null);
    }
  }, []);

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

    setShowSpinner(true);
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
