import { fetchNotificationsResolved } from "@/lib/data/repositories/notifications";
import DashboardNotificationsPage from "./notifications-client";

export default async function NotificationsPage() {
  const { items, source } = await fetchNotificationsResolved();
  return <DashboardNotificationsPage initialNotifications={items} dataSource={source} />;
}
