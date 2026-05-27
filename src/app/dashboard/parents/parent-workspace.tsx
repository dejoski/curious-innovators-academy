"use client";

import React, { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import ParentHomeDashboard from "./home/parent-home-dashboard";
import ParentScheduleClient from "./schedule/parent-schedule-client";
import ParentBillingClient from "./billing/billing-client";
import ParentCatalogClient from "./catalog/catalog-client";
import ParentClassesCoreClient from "./classes/core/classes-core-client";
import ParentClassesEnrichmentClient from "./classes/enrichment/classes-enrichment-client";
import ParentStudentsClient from "./students/students-client";
import {
  DASHBOARD_WORKSPACE_EVENT,
  PARENT_VIEW_PATHS,
  dispatchDashboardWorkspaceView,
  parentViewFromPath,
  pathAndSearchFromHref,
  type ParentView,
} from "@/lib/dashboard/workspace";

type ParentWorkspaceProps = {
  initialView?: ParentView;
};

function classNameForView(active: boolean) {
  return active ? "block" : "hidden";
}

function PanelFallback({ label }: { label: string }) {
  return (
    <div className="mx-auto w-full max-w-[1104px] p-6 text-sm text-[#666d80] md:p-8">
      {label}
    </div>
  );
}

function viewHref(view: ParentView, search: string) {
  return `${PARENT_VIEW_PATHS[view]}${search}`;
}

export default function ParentWorkspace({ initialView = "home" }: ParentWorkspaceProps) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();
  const search = currentSearch ? `?${currentSearch}` : "";
  const [activeView, setActiveView] = React.useState<ParentView>(
    () => parentViewFromPath(pathname) ?? initialView,
  );

  const setWorkspaceView = React.useCallback(
    (view: ParentView, nextSearch = search, mode: "push" | "replace" = "push") => {
      const nextPath = PARENT_VIEW_PATHS[view];
      const nextHref = viewHref(view, nextSearch);
      setActiveView(view);

      if (typeof window !== "undefined" && `${window.location.pathname}${window.location.search}` !== nextHref) {
        if (mode === "replace") window.history.replaceState(null, "", nextHref);
        else window.history.pushState(null, "", nextHref);
      }

      dispatchDashboardWorkspaceView({
        workspace: "parent",
        view,
        path: nextPath,
        href: nextHref,
      });
    },
    [search],
  );

  React.useEffect(() => {
    const next = parentViewFromPath(pathname);
    if (next) setActiveView(next);
  }, [pathname]);

  React.useEffect(() => {
    function handlePopState() {
      const next = parentViewFromPath(window.location.pathname);
      if (next) setActiveView(next);
    }

    function handleWorkspaceView(event: Event) {
      const detail = (event as CustomEvent<{ workspace?: string; view?: ParentView }>).detail;
      if (detail?.workspace !== "parent") return;
      if (detail.view) setActiveView(detail.view);
    }

    window.addEventListener("popstate", handlePopState);
    window.addEventListener(DASHBOARD_WORKSPACE_EVENT, handleWorkspaceView);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener(DASHBOARD_WORKSPACE_EVENT, handleWorkspaceView);
    };
  }, []);

  function handleWorkspaceClick(event: React.MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as HTMLElement).closest("a[href]");
    if (
      !anchor ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = pathAndSearchFromHref(anchor.getAttribute("href"));
    if (!target) return;
    const nextView = parentViewFromPath(target.path);
    if (!nextView) return;

    event.preventDefault();
    event.stopPropagation();
    setWorkspaceView(nextView, target.search);
  }

  return (
    <div className="min-h-full" onClickCapture={handleWorkspaceClick}>
      <div className={classNameForView(activeView === "home")} aria-hidden={activeView !== "home"}>
        <Suspense fallback={<PanelFallback label="Loading dashboard..." />}>
          <ParentHomeDashboard />
        </Suspense>
      </div>

      <div className={classNameForView(activeView === "schedule")} aria-hidden={activeView !== "schedule"}>
        <Suspense fallback={<PanelFallback label="Loading schedule..." />}>
          <ParentScheduleClient />
        </Suspense>
      </div>

      <div className={classNameForView(activeView === "billing")} aria-hidden={activeView !== "billing"}>
        <ParentBillingClient />
      </div>

      <div className={classNameForView(activeView === "catalog")} aria-hidden={activeView !== "catalog"}>
        <ParentCatalogClient />
      </div>

      <div className={classNameForView(activeView === "classes-core")} aria-hidden={activeView !== "classes-core"}>
        <ParentClassesCoreClient />
      </div>

      <div
        className={classNameForView(activeView === "classes-enrichment")}
        aria-hidden={activeView !== "classes-enrichment"}
      >
        <ParentClassesEnrichmentClient />
      </div>

      <div className={classNameForView(activeView === "students")} aria-hidden={activeView !== "students"}>
        <ParentStudentsClient />
      </div>
    </div>
  );
}
