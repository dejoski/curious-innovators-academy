import AdminWorkspacePage from "../../admin-workspace-page";
import { fetchAdminStudentSchedulesResolved } from "@/lib/data/repositories/student-details";

export default async function AdminStudentScheduleRoute() {
  const { rows, source } = await fetchAdminStudentSchedulesResolved();
  return <AdminWorkspacePage initialView="student-schedule" initialData={{ studentSchedules: { rows, source } }} />;
}
