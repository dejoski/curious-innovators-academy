export const DASHBOARD_WORKSPACE_EVENT = "cia-dashboard-workspace-view";

export type ClassesView = "core" | "enrichment" | "requests" | "approvals";
export type ParentView =
  | "home"
  | "schedule"
  | "billing"
  | "catalog"
  | "classes-core"
  | "classes-enrichment"
  | "students";
export type AdminView =
  | "home"
  | "schedule"
  | "classes"
  | "students"
  | "student-schedule"
  | "student-roster"
  | "parents"
  | "teachers"
  | "notifications";

// type DashboardWorkspaceId removed - unused

export type DashboardWorkspaceRoute =
  | { workspace: "admin"; view: AdminView; path: string }
  | { workspace: "classes"; view: ClassesView; path: string }
  | { workspace: "parent"; view: ParentView; path: string };

export type DashboardWorkspaceViewChangeDetail = DashboardWorkspaceRoute & {
  href: string;
};

export const CLASSES_VIEW_PATHS: Record<ClassesView, string> = {
  core: "/dashboard/classes/core",
  enrichment: "/dashboard/classes/enrichment",
  requests: "/dashboard/classes/requests",
  approvals: "/dashboard/classes/approvals",
};

export const PARENT_VIEW_PATHS: Record<ParentView, string> = {
  home: "/dashboard/parents/home",
  schedule: "/dashboard/parents/schedule",
  billing: "/dashboard/parents/billing",
  catalog: "/dashboard/parents/catalog",
  "classes-core": "/dashboard/parents/classes/core",
  "classes-enrichment": "/dashboard/parents/classes/enrichment",
  students: "/dashboard/parents/students",
};

export const ADMIN_VIEW_PATHS: Record<AdminView, string> = {
  home: "/dashboard",
  schedule: "/dashboard/schedule",
  classes: "/dashboard/classes/core",
  students: "/dashboard/students",
  "student-schedule": "/dashboard/students/schedule",
  "student-roster": "/dashboard/students/roster",
  parents: "/dashboard/parents",
  teachers: "/dashboard/teachers",
  notifications: "/dashboard/notifications",
};

export function classesViewFromPath(pathname: string): ClassesView | null {
  if (pathname === "/dashboard/classes" || pathname === "/dashboard/classes/") return "core";
  if (pathname === "/dashboard/classes/requests") return "requests";
  if (pathname === "/dashboard/classes/approvals") return "approvals";
  if (pathname === "/dashboard/classes/enrichment") return "enrichment";
  if (pathname === "/dashboard/classes/core") return "core";
  return null;
}

export function parentViewFromPath(pathname: string): ParentView | null {
  if (pathname === "/dashboard/parents/home") return "home";
  if (pathname === "/dashboard/parents/schedule") return "schedule";
  if (pathname === "/dashboard/parents/billing") return "billing";
  if (pathname === "/dashboard/parents/catalog") return "catalog";
  if (pathname === "/dashboard/parents/classes" || pathname === "/dashboard/parents/classes/") {
    return "classes-core";
  }
  if (pathname === "/dashboard/parents/classes/core") return "classes-core";
  if (pathname === "/dashboard/parents/classes/enrichment") return "classes-enrichment";
  if (pathname === "/dashboard/parents/students") return "students";
  return null;
}

export function adminViewFromPath(pathname: string): AdminView | null {
  if (pathname === "/dashboard" || pathname === "/dashboard/") return "home";
  if (pathname === "/dashboard/schedule") return "schedule";
  if (classesViewFromPath(pathname)) return "classes";
  if (pathname === "/dashboard/students") return "students";
  if (pathname === "/dashboard/students/schedule") return "student-schedule";
  if (pathname === "/dashboard/students/roster") return "student-roster";
  if (pathname === "/dashboard/parents") return "parents";
  if (pathname === "/dashboard/teachers") return "teachers";
  if (pathname === "/dashboard/notifications") return "notifications";
  return null;
}

export function dashboardWorkspaceRouteFromPath(pathname: string): DashboardWorkspaceRoute | null {
  const parentView = parentViewFromPath(pathname);
  if (parentView) {
    return { workspace: "parent", view: parentView, path: PARENT_VIEW_PATHS[parentView] };
  }

  const adminView = adminViewFromPath(pathname);
  if (adminView) {
    return {
      workspace: "admin",
      view: adminView,
      path: adminView === "classes" && classesViewFromPath(pathname) ? pathname : ADMIN_VIEW_PATHS[adminView],
    };
  }

  const classesView = classesViewFromPath(pathname);
  if (classesView) {
    return { workspace: "classes", view: classesView, path: CLASSES_VIEW_PATHS[classesView] };
  }

  return null;
}

export function sameDashboardWorkspace(currentPath: string, nextPath: string) {
  const current = dashboardWorkspaceRouteFromPath(currentPath);
  const next = dashboardWorkspaceRouteFromPath(nextPath);
  return Boolean(current && next && current.workspace === next.workspace);
}

export function dispatchDashboardWorkspaceView(detail: DashboardWorkspaceViewChangeDetail) {
  window.dispatchEvent(new CustomEvent(DASHBOARD_WORKSPACE_EVENT, { detail }));
  const classesView = classesViewFromPath(detail.path);
  if (classesView) {
    window.dispatchEvent(
      new CustomEvent("cia-classes-workspace-view", {
        detail: { ...detail, workspace: "classes", view: classesView },
      }),
    );
  }
}

export function pathAndSearchFromHref(href: string | null) {
  if (!href) return null;
  try {
    const url = new URL(href, window.location.origin);
    return {
      href: `${url.pathname}${url.search}`,
      path: url.pathname,
      search: url.search,
    };
  } catch {
    if (!href.startsWith("/")) return null;
    const [path = "", query = ""] = href.split("?");
    return {
      href: query ? `${path}?${query}` : path,
      path,
      search: query ? `?${query}` : "",
    };
  }
}
