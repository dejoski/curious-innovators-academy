import AdminWorkspace from "./admin-workspace";
import type { AdminView } from "@/lib/dashboard/workspace";

export default function AdminWorkspacePage({ initialView }: { initialView: AdminView }) {
  return <AdminWorkspace initialView={initialView} />;
}
