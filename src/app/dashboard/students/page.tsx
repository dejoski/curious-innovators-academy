import AdminWorkspacePage from "../admin-workspace-page";
import { fetchAdminStudentsResolved } from "@/lib/data/repositories/students";

export default async function StudentsPage() {
  const { items, source } = await fetchAdminStudentsResolved();
  return <AdminWorkspacePage initialView="students" initialData={{ students: { rows: items, source } }} />;
}
