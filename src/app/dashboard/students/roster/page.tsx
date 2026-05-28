import AdminWorkspacePage from "../../admin-workspace-page";
import { fetchAdminClassOptionsResolved } from "@/lib/data/repositories/classes";

export default async function AdminStudentRosterRoute() {
  const { items, source } = await fetchAdminClassOptionsResolved();
  return <AdminWorkspacePage initialView="student-roster" initialData={{ classOptions: { rows: items, source } }} />;
}
