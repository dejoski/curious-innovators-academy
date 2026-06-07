"use client";

import React from "react";
import DashboardHomeView from "@/components/dashboard-home-view";
import { peekDashboardData } from "@/lib/client-data-cache";
import { useDashboardData } from "@/lib/data-load";
import type { ResolvedDashboardPresentation } from "@/lib/data/repositories/dashboard";
import type { DashboardNotification, EnrichmentRequestRow } from "@/lib/data/types";

const DASHBOARD_PRESENTATION_URL = "/api/dashboard-presentation";
const REQUESTS_URL = "/api/data/enrichment-requests";
const NOTIFICATIONS_URL = "/api/data/notifications";

export default function DashboardHomeClient() {
  const cachedPresentation = peekDashboardData<ResolvedDashboardPresentation>(DASHBOARD_PRESENTATION_URL);
  const cachedRequests = peekDashboardData<{ requests?: EnrichmentRequestRow[] }>(REQUESTS_URL);
  const cachedNotifications = peekDashboardData<{ notifications?: DashboardNotification[] }>(NOTIFICATIONS_URL);

  const [presentationState] = useDashboardData(
    DASHBOARD_PRESENTATION_URL,
    (body) => body as ResolvedDashboardPresentation,
    cachedPresentation,
  );
  const [requestsState] = useDashboardData(
    REQUESTS_URL,
    (body) => ((body as { requests?: EnrichmentRequestRow[] }).requests ?? []),
    cachedRequests?.requests,
  );
  const [notificationsState] = useDashboardData(
    NOTIFICATIONS_URL,
    (body) => ((body as { notifications?: DashboardNotification[] }).notifications ?? []),
    cachedNotifications?.notifications,
  );

  return (
    <DashboardHomeView
      presentation={presentationState.data}
      requests={requestsState.data ?? []}
      notifications={notificationsState.data ?? []}
      presentationLoading={presentationState.loading}
      requestsLoading={requestsState.loading}
      notificationsLoading={notificationsState.loading}
      requestsResolved={requestsState.resolved}
      notificationsResolved={notificationsState.resolved}
    />
  );
}
