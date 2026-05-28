import AdminWorkspace from "./admin-workspace";
import type { DataSource } from "@/lib/data/fetch-source";
import type { SchoolClassOptionRow, StudentListItem, StudentScheduleRow } from "@/lib/data/types";
import type { AdminView } from "@/lib/dashboard/workspace";

export type AdminWorkspaceInitialData = {
  students?: { rows: StudentListItem[]; source: DataSource };
  studentSchedules?: { rows: StudentScheduleRow[]; source: DataSource };
  classOptions?: { rows: SchoolClassOptionRow[]; source: DataSource };
};

export default function AdminWorkspacePage({
  initialView,
  initialData,
}: {
  initialView: AdminView;
  initialData?: AdminWorkspaceInitialData;
}) {
  return <AdminWorkspace initialView={initialView} initialData={initialData} />;
}
