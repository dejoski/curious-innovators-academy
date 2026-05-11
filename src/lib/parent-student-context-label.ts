/**
 * Header copy for the parent-shell student context selector, keyed by pathname.
 */
import { PARENT_SCHEDULE_HREF } from "@/lib/dashboard/parent-schedule-route";

export function getParentStudentContextLabel(pathname: string): string {
  if (!pathname.startsWith("/dashboard/parents")) {
    return "Viewing dashboard for";
  }
  if (pathname.startsWith("/dashboard/parents/students")) {
    return "Viewing profile for";
  }
  if (pathname.startsWith("/dashboard/parents/catalog")) {
    return "Showing classes for";
  }
  if (pathname.startsWith(PARENT_SCHEDULE_HREF)) {
    return "Showing schedule for";
  }
  if (pathname.startsWith("/dashboard/parents/classes")) {
    return "Showing classes for";
  }
  if (pathname.startsWith("/dashboard/parents/feedback")) {
    return "Sharing feedback for";
  }
  if (pathname.startsWith("/dashboard/parents/home")) {
    return "Viewing home for";
  }
  return "Viewing dashboard for";
}
