import "server-only";

import type { ResolvedList } from "@/lib/data/fetch-source";
import type { DashboardNotification } from "@/lib/data/types";
import { isSupabaseConfigured, unavailableList } from "@/lib/data/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type NotificationReadClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

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

async function queryNotificationsForRecipient(
  supabase: NotificationReadClient,
  recipientProfileId: string,
): Promise<ResolvedList<DashboardNotification>> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, href, read_at, created_at")
    .eq("recipient_profile_id", recipientProfileId)
    .order("created_at", { ascending: false });

  if (error) {
    return unavailableList();
  }

  if (!data?.length) {
    return { items: [], source: "remote" };
  }

  const mapped = data
    .map((row) => mapNotificationRow(row as unknown as Record<string, unknown>))
    .filter((x): x is DashboardNotification => x !== null);

  if (mapped.length === 0) {
    return unavailableList();
  }
  return { items: mapped, source: "remote" };
}

async function loadNotificationsResolved(): Promise<ResolvedList<DashboardNotification>> {
  if (!isSupabaseConfigured()) {
    return unavailableList();
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

    if (user?.id) {
      return queryNotificationsForRecipient(supabase, user.id);
    }

    return unavailableList();
  } catch {
    return unavailableList();
  }
}

/** Loads notifications. */
export async function fetchNotifications(): Promise<DashboardNotification[]> {
  const { items } = await loadNotificationsResolved();
  return items;
}

export async function fetchNotificationsResolved(): Promise<ResolvedList<DashboardNotification>> {
  return loadNotificationsResolved();
}
