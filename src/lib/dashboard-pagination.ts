export type DashboardPageToken = number | "ellipsis";

export function getVisibleDashboardPages(current: number, total: number): DashboardPageToken[] {
  if (total <= 0) return [];
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, "ellipsis", total];
  if (current >= total - 2) return [1, "ellipsis", total - 2, total - 1, total];
  return [1, "ellipsis", current, "ellipsis", total];
}
