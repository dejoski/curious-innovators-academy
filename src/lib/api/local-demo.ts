import {
  DEMO_UI_ROLE_COOKIE_NAME,
  isDemoLoginEnabled,
} from "@/lib/demo-login";
import {
  isDashboardPersona,
  type DashboardPersona,
} from "@/lib/dashboard/persona";

function cookieValue(cookieHeader: string, name: string): string {
  const prefix = `${name}=`;
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) ?? "";
}

export function localDemoRoleFromRequest(request: Request): DashboardPersona | null {
  const hostname = new URL(request.url).hostname;
  if (!isDemoLoginEnabled(hostname)) return null;

  const rawRole = decodeURIComponent(
    cookieValue(request.headers.get("cookie") ?? "", DEMO_UI_ROLE_COOKIE_NAME),
  );
  return isDashboardPersona(rawRole) ? rawRole : null;
}
