"use client";

import React from "react";
import { usePathname } from "next/navigation";
import ClassesWorkspace from "./classes/classes-workspace";
import {
  AdminHomePanel,
  AdminNotificationsPanel,
  AdminParentsPanel,
  AdminSchedulePanel,
  AdminStudentRosterPanel,
  AdminStudentSchedulePanel,
  AdminStudentsPanel,
  AdminTeachersPanel,
} from "./admin-panels";
import type { AdminWorkspaceInitialData } from "./admin-workspace-page";
import {
  ADMIN_VIEW_PATHS,
  DASHBOARD_WORKSPACE_EVENT,
  adminViewFromPath,
  dispatchDashboardWorkspaceView,
  pathAndSearchFromHref,
  type AdminView,
} from "@/lib/dashboard/workspace";

type AdminWorkspaceProps = {
  initialView?: AdminView;
  initialData?: AdminWorkspaceInitialData;
};

export default function AdminWorkspace({ initialView = "home", initialData }: AdminWorkspaceProps) {
  const pathname = usePathname() ?? "";
  const [activeView, setActiveView] = React.useState<AdminView>(
    () => adminViewFromPath(pathname) ?? initialView,
  );

  const setWorkspaceView = React.useCallback(
    (view: AdminView, href = ADMIN_VIEW_PATHS[view], path = ADMIN_VIEW_PATHS[view]) => {
      setActiveView(view);
      if (typeof window !== "undefined" && `${window.location.pathname}${window.location.search}` !== href) {
        window.history.pushState(null, "", href);
      }
      dispatchDashboardWorkspaceView({
        workspace: "admin",
        view,
        path,
        href,
      });
    },
    [],
  );

  React.useEffect(() => {
    const next = adminViewFromPath(pathname);
    if (next) setActiveView(next);
  }, [pathname]);

  React.useEffect(() => {
    function handlePopState() {
      const next = adminViewFromPath(window.location.pathname);
      if (next) setActiveView(next);
    }

    function handleWorkspaceView(event: Event) {
      const detail = (event as CustomEvent<{ workspace?: string; view?: AdminView }>).detail;
      if (detail?.workspace !== "admin") return;
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
    const nextView = adminViewFromPath(target.path);
    if (!nextView) return;

    event.preventDefault();
    event.stopPropagation();
    setWorkspaceView(nextView, target.href, target.path);
  }

  let panel: React.ReactNode;
  switch (activeView) {
    case "schedule":
      panel = <AdminSchedulePanel />;
      break;
    case "classes":
      panel = <ClassesWorkspace />;
      break;
    case "students":
      panel = <AdminStudentsPanel initialData={initialData?.students} />;
      break;
    case "student-schedule":
      panel = <AdminStudentSchedulePanel initialData={initialData?.studentSchedules} />;
      break;
    case "student-roster":
      panel = <AdminStudentRosterPanel initialData={initialData?.classOptions} />;
      break;
    case "parents":
      panel = <AdminParentsPanel />;
      break;
    case "teachers":
      panel = <AdminTeachersPanel />;
      break;
    case "notifications":
      panel = <AdminNotificationsPanel />;
      break;
    case "home":
    default:
      panel = <AdminHomePanel />;
      break;
  }

  return (
    <div className="min-h-full" onClickCapture={handleWorkspaceClick}>
      {panel}
    </div>
  );
}
