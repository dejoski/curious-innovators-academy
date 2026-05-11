import type { ResolvedList } from "@/lib/data/fetch-source";
import type { DashboardNotification } from "@/lib/data/types";
import { isSupabaseConfigured } from "@/lib/data/env";
import { NOTIFICATIONS_FALLBACK } from "@/lib/data/mock/notifications";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function mapNotificationRow(row: Record<string, unknown>): DashboardNotification | null {
  const id = row.id != null ? String(row.id) : "";
  if (!id) return null;

  const read = row.read_at != null && String(row.read_at) !== "";

  return {
    id,
    title: String(row.title ?? ""),
    detail: String(row.detail ?? row.body ?? ""),
    time: String(row.time_display ?? row.time_ago ?? row.created_at ?? ""),
    href: String(row.href ?? row.link ?? "/dashboard"),
    read,
  };
}

async function loadNotificationsResolved(): Promise<ResolvedList<DashboardNotification>> {
  if (!isSupabaseConfigured()) {
    return { items: [...NOTIFICATIONS_FALLBACK], source: "fallback" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, body, href, read_at, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return { items: [...NOTIFICATIONS_FALLBACK], source: "fallback" };
    }

    if (!data?.length) {
      return { items: [], source: "remote" };
    }

    const mapped = data
      .map((row) => mapNotificationRow(row as unknown as Record<string, unknown>))
      .filter((x): x is DashboardNotification => x !== null);

    if (mapped.length === 0) {
      return { items: [...NOTIFICATIONS_FALLBACK], source: "fallback" };
    }
    return { items: mapped, source: "remote" };
  } catch {
    return { items: [...NOTIFICATIONS_FALLBACK], source: "fallback" };
  }
}

/** Loads notifications; falls back to demo seed when offline or on error. */
export async function fetchNotifications(): Promise<DashboardNotification[]> {
  const { items } = await loadNotificationsResolved();
  return items;
}

export async function fetchNotificationsResolved(): Promise<ResolvedList<DashboardNotification>> {
  return loadNotificationsResolved();
}
