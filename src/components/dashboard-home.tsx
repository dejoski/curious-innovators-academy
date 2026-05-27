import DashboardHomeView from "@/components/dashboard-home-view";
import { fetchNotificationsResolved } from "@/lib/data/repositories/notifications";
import { resolveDashboardPresentation } from "@/lib/data/repositories/dashboard";
import { fetchAdminEnrichmentRequestsResolved } from "@/lib/data/repositories/requests";

export async function DashboardHomeResolved() {
  const [presentation, { items: requests }, { items: notifications }] = await Promise.all([
    resolveDashboardPresentation(),
    fetchAdminEnrichmentRequestsResolved(),
    fetchNotificationsResolved(),
  ]);

  return (
    <DashboardHomeView
      presentation={presentation}
      requests={requests}
      notifications={notifications}
    />
  );
}
