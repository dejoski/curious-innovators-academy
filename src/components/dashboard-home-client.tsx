"use client";

import React from "react";
import DashboardHomeView from "@/components/dashboard-home-view";
import {
  peekDashboardData,
  readDashboardData,
} from "@/lib/client-data-cache";
import type { ResolvedDashboardPresentation } from "@/lib/data/repositories/dashboard";
import type { DashboardNotification, EnrichmentRequestRow } from "@/lib/data/types";

const DASHBOARD_PRESENTATION_URL = "/api/dashboard-presentation";
const REQUESTS_URL = "/api/data/enrichment-requests";
const NOTIFICATIONS_URL = "/api/data/notifications";

export default function DashboardHomeClient() {
  const cachedPresentation = peekDashboardData<ResolvedDashboardPresentation>(DASHBOARD_PRESENTATION_URL);
  const cachedRequests = peekDashboardData<{ requests?: EnrichmentRequestRow[] }>(REQUESTS_URL);
  const cachedNotifications = peekDashboardData<{ notifications?: DashboardNotification[] }>(NOTIFICATIONS_URL);

  const [presentation, setPresentation] = React.useState<ResolvedDashboardPresentation | null>(
    () => cachedPresentation ?? null,
  );
  const [requests, setRequests] = React.useState<EnrichmentRequestRow[]>(
    () => cachedRequests?.requests ?? [],
  );
  const [notifications, setNotifications] = React.useState<DashboardNotification[]>(
    () => cachedNotifications?.notifications ?? [],
  );
  const [presentationLoading, setPresentationLoading] = React.useState(() => !cachedPresentation);
  const [requestsLoading, setRequestsLoading] = React.useState(() => !cachedRequests);
  const [notificationsLoading, setNotificationsLoading] = React.useState(() => !cachedNotifications);
  const [requestsResolved, setRequestsResolved] = React.useState(() => Boolean(cachedRequests));
  const [notificationsResolved, setNotificationsResolved] = React.useState(() => Boolean(cachedNotifications));

  React.useEffect(() => {
    let cancelled = false;
    void readDashboardData<ResolvedDashboardPresentation>(DASHBOARD_PRESENTATION_URL)
      .then((body) => {
        if (!cancelled) setPresentation(body);
      })
      .catch(() => {
        if (!cancelled) setPresentation(null);
      })
      .finally(() => {
        if (!cancelled) setPresentationLoading(false);
      });
    void readDashboardData<{ requests?: EnrichmentRequestRow[] }>(REQUESTS_URL)
      .then((body) => {
        if (!cancelled) setRequests(body.requests ?? []);
        if (!cancelled) setRequestsResolved(true);
      })
      .catch(() => {
        if (!cancelled) setRequests([]);
        if (!cancelled) setRequestsResolved(false);
      })
      .finally(() => {
        if (!cancelled) setRequestsLoading(false);
      });
    void readDashboardData<{ notifications?: DashboardNotification[] }>(NOTIFICATIONS_URL)
      .then((body) => {
        if (!cancelled) setNotifications(body.notifications ?? []);
        if (!cancelled) setNotificationsResolved(true);
      })
      .catch(() => {
        if (!cancelled) setNotifications([]);
        if (!cancelled) setNotificationsResolved(false);
      })
      .finally(() => {
        if (!cancelled) setNotificationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardHomeView
      presentation={presentation}
      requests={requests}
      notifications={notifications}
      presentationLoading={presentationLoading}
      requestsLoading={requestsLoading}
      notificationsLoading={notificationsLoading}
      requestsResolved={requestsResolved}
      notificationsResolved={notificationsResolved}
    />
  );
}
