"use client";

import React from "react";
import DashboardNotificationsPage from "@/app/dashboard/notifications/notifications-client";
import { DashboardPanelError } from "@/components/dashboard-loading-state";
import {
  peekDashboardData,
  readDashboardData,
} from "@/lib/client-data-cache";
import type { DashboardNotification, DataSource } from "@/lib/data";

const NOTIFICATIONS_URL = "/api/data/notifications";

function sourceOrUnavailable(source: DataSource | undefined): DataSource {
  return source ?? "unavailable";
}

export default function DashboardNotificationsPanel() {
  const cached = peekDashboardData<{ notifications?: DashboardNotification[]; source?: DataSource }>(NOTIFICATIONS_URL);
  const [notifications, setNotifications] = React.useState<DashboardNotification[]>(() => cached?.notifications ?? []);
  const [source, setSource] = React.useState<DataSource>(() => sourceOrUnavailable(cached?.source));
  const [status, setStatus] = React.useState<"ready" | "error">("ready");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void readDashboardData<{ notifications?: DashboardNotification[]; source?: DataSource }>(NOTIFICATIONS_URL)
      .then((body) => {
        if (cancelled) return;
        setNotifications(body.notifications ?? []);
        setSource(sourceOrUnavailable(body.source));
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setNotifications([]);
          setSource("unavailable");
          setError(`Could not load notifications: ${err instanceof Error ? err.message : String(err)}.`);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "error") return <DashboardPanelError message={error ?? "Could not load notifications."} />;
  return <DashboardNotificationsPage initialNotifications={notifications} dataSource={source} />;
}
