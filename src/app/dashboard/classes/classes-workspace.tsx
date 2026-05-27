"use client";

import React, { Suspense } from "react";
import { usePathname } from "next/navigation";
import type { ProgramTrack } from "@/lib/data/types";
import {
  CLASSES_VIEW_PATHS,
  classesViewFromPath,
  type ClassesView,
} from "@/lib/dashboard/classes-workspace";
import {
  DASHBOARD_WORKSPACE_EVENT,
  dispatchDashboardWorkspaceView,
} from "@/lib/dashboard/workspace";
import ClassesPageClient from "./classes-client";
import ClassesEnrichmentRequests from "./requests/requests-client";
import { ClassesApprovalHistory } from "./approvals/approvals-client";

type ClassesWorkspaceProps = {
  initialView?: ClassesView;
};

const EMPTY_DECISION_SUMMARY = {
  approved: 0,
  waitlisted: 0,
  rejected: 0,
};

function classNameForView(active: boolean) {
  return active ? "block" : "hidden";
}

export default function ClassesWorkspace({ initialView = "core" }: ClassesWorkspaceProps) {
  const pathname = usePathname() ?? "";
  const [activeView, setActiveView] = React.useState<ClassesView>(
    () => classesViewFromPath(pathname) ?? initialView,
  );

  const showClassList = activeView === "core" || activeView === "enrichment";
  const activeTrack: ProgramTrack = activeView === "enrichment" ? "enrichment" : "core";

  const setWorkspaceView = React.useCallback((view: ClassesView, mode: "push" | "replace" = "push") => {
    const nextPath = CLASSES_VIEW_PATHS[view];
    setActiveView(view);

    if (typeof window !== "undefined" && window.location.pathname !== nextPath) {
      if (mode === "replace") window.history.replaceState(null, "", nextPath);
      else window.history.pushState(null, "", nextPath);
    }

    dispatchDashboardWorkspaceView({
      workspace: "classes",
      view,
      path: nextPath,
      href: nextPath,
    });
  }, []);

  React.useEffect(() => {
    const next = classesViewFromPath(pathname);
    if (next) setActiveView(next);
  }, [pathname]);

  React.useEffect(() => {
    function handlePopState() {
      const next = classesViewFromPath(window.location.pathname);
      if (next) setActiveView(next);
    }

    function handleWorkspaceView(event: Event) {
      const detail = (event as CustomEvent<{ workspace?: string; view?: ClassesView }>).detail;
      if (detail?.workspace && detail.workspace !== "classes") return;
      if (detail?.view) setActiveView(detail.view);
    }

    window.addEventListener("popstate", handlePopState);
    window.addEventListener(DASHBOARD_WORKSPACE_EVENT, handleWorkspaceView);
    window.addEventListener("cia-classes-workspace-view", handleWorkspaceView);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener(DASHBOARD_WORKSPACE_EVENT, handleWorkspaceView);
      window.removeEventListener("cia-classes-workspace-view", handleWorkspaceView);
    };
  }, []);

  return (
    <div className="min-h-full">
      <div className={classNameForView(showClassList)} aria-hidden={!showClassList}>
        <ClassesPageClient
          initialClasses={[]}
          dataSource="unavailable"
          initialTrack={activeTrack}
          onTrackChange={(track) => setWorkspaceView(track)}
        />
      </div>

      <div className={classNameForView(activeView === "requests")} aria-hidden={activeView !== "requests"}>
        <Suspense fallback={<div className="p-8 text-center text-[#666d80]">Loading requests...</div>}>
          <ClassesEnrichmentRequests
            initialRequests={[]}
            dataSource="unavailable"
            initialDecisionSummary={EMPTY_DECISION_SUMMARY}
          />
        </Suspense>
      </div>

      <div className={classNameForView(activeView === "approvals")} aria-hidden={activeView !== "approvals"}>
        <Suspense fallback={<div className="p-8 text-center text-[#666d80]">Loading approvals...</div>}>
          <ClassesApprovalHistory />
        </Suspense>
      </div>
    </div>
  );
}
