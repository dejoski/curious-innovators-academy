import "server-only";

import type { ResolvedList } from "@/lib/data/fetch-source";
import type { DashboardNotification } from "@/lib/data/types";
import {
  canUsePrivilegedDemoData,
  fallbackList,
  isSupabaseConfigured,
  unavailableList,
} from "@/lib/data/env";
import { isSupabaseAdminConfigured } from "@/lib/data/server-env";
import { DEMO_UI_ROLE_COOKIE_NAME } from "@/lib/demo-login";
import {
  isDashboardPersona,
  type DashboardPersona,
} from "@/lib/dashboard/persona";
import { NOTIFICATIONS_FALLBACK } from "@/lib/data/mock/notifications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

type NotificationReadClient =
  | Awaited<ReturnType<typeof createSupabaseServerClient>>
  | ReturnType<typeof createSupabaseAdminClient>;

const DEMO_NOTIFICATION_EMAIL_BY_ROLE: Record<DashboardPersona, string> = {
  admin: "name.example@gmail.com",
  parent: "parent.lee@cia.demo",
  teacher: "teacher.emily@cia.demo",
  student: "student.anna@cia.demo",
};

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

function demoRoleFromCookieValue(value: string | undefined): DashboardPersona {
  return isDashboardPersona(value) ? value : "parent";
}

async function resolveDemoRecipientProfileId(): Promise<string | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const cookieStore = await cookies();
  const role = demoRoleFromCookieValue(cookieStore.get(DEMO_UI_ROLE_COOKIE_NAME)?.value);
  const email = DEMO_NOTIFICATION_EMAIL_BY_ROLE[role];
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (error || !data?.id) return null;
  return String(data.id);
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
    return fallbackList(NOTIFICATIONS_FALLBACK);
  }

  if (!data?.length) {
    return { items: [], source: "remote" };
  }

  const mapped = data
    .map((row) => mapNotificationRow(row as unknown as Record<string, unknown>))
    .filter((x): x is DashboardNotification => x !== null);

  if (mapped.length === 0) {
    return fallbackList(NOTIFICATIONS_FALLBACK);
  }
  return { items: mapped, source: "remote" };
}

async function loadNotificationsResolved(): Promise<ResolvedList<DashboardNotification>> {
  if (!isSupabaseConfigured()) {
    return fallbackList(NOTIFICATIONS_FALLBACK);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

    if (user?.id) {
      return queryNotificationsForRecipient(supabase, user.id);
    }

    if (!canUsePrivilegedDemoData()) {
      return unavailableList();
    }

    const demoRecipientProfileId = await resolveDemoRecipientProfileId();
    if (!demoRecipientProfileId) {
      return fallbackList(NOTIFICATIONS_FALLBACK);
    }

    return queryNotificationsForRecipient(createSupabaseAdminClient(), demoRecipientProfileId);
  } catch {
    return fallbackList(NOTIFICATIONS_FALLBACK);
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
