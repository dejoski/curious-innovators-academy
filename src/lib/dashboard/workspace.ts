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

type ViewPath = { path: string; view: ClassesView | ParentView | AdminView | null };

const PATH_TO_CLASSES_VIEW: Record<string, ClassesView> = {
  "/dashboard/classes/core": "core",
  "/dashboard/classes/enrichment": "enrichment",
  "/dashboard/classes/requests": "requests",
  "/dashboard/classes/approvals": "approvals",
};

const PATH_TO_PARENT_VIEW: Record<string, ParentView> = {
  "/dashboard/parents/home": "home",
  "/dashboard/parents/schedule": "schedule",
  "/dashboard/parents/billing": "billing",
  "/dashboard/parents/catalog": "catalog",
  "/dashboard/parents/students": "students",
  "/dashboard/parents/classes/core": "classes-core",
  "/dashboard/parents/classes/enrichment": "classes-enrichment",
};

const PATH_TO_ADMIN_VIEW: Record<string, AdminView> = {
  "/dashboard": "home",
  "/dashboard/schedule": "schedule",
  "/dashboard/students": "students",
  "/dashboard/students/schedule": "student-schedule",
  "/dashboard/students/roster": "student-roster",
  "/dashboard/parents": "parents",
  "/dashboard/teachers": "teachers",
  "/dashboard/notifications": "notifications",
};

function normalizePath(pathname: string): string {
  if (pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function exactOrTrailingSlash(pathname: string): string {
  const normalized = normalizePath(pathname);
  return pathname === normalized ? pathname : pathname;
}

function viewFromPath(pathname: string, mapping: Record<string, string>, fallback?: { fn: (p: string) => string | null }): string | null {
  const normalized = normalizePath(pathname);
  const candidate = pathname === normalized ? pathname : pathname;
  const path = normalized in mapping ? normalized : candidate;
  if (path in mapping) return mapping[path];
  if (fallback?.fn) return fallback.fn(pathname);
  return null;
}

export function classesViewFromPath(pathname: string): ClassesView | null {
  const classesPath = exactOrTrailingSlash(pathname);
  const result = viewFromPath(classesPath, PATH_TO_CLASSES_VIEW, {
    fn: (p) => {
      if (p === "/dashboard/classes" || p === "/dashboard/classes/") return "core";
      return null;
    },
  });
  return (result as ClassesView) ?? null;
}

export function parentViewFromPath(pathname: string): ParentView | null {
  const result = viewFromPath(pathname, PATH_TO_PARENT_VIEW, {
    fn: (p) => {
      if (p === "/dashboard/parents" || p === "/dashboard/parents/") return "classes-core";
      return null;
    },
  });
  return (result as ParentView) ?? null;
}

export function adminViewFromPath(pathname: string): AdminView | null {
  const normalized = normalizePath(pathname);
  const candidate = pathname === normalized ? pathname : pathname;
  if (candidate in PATH_TO_ADMIN_VIEW) return PATH_TO_ADMIN_VIEW[candidate] as AdminView;
  if (classesViewFromPath(pathname)) return "classes";
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
