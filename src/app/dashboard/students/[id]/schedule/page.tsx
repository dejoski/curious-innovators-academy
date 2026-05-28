import { fetchAdminStudentScheduleResolved } from "@/lib/data/repositories/student-details";
import StudentScheduleClient from "./student-schedule-client";

type PageProps = { params: Promise<{ id: string }> };

export default async function StudentSchedulePage({ params }: PageProps) {
  const { id } = await params;
  const { rows, source } = await fetchAdminStudentScheduleResolved(id);
  return <StudentScheduleClient studentId={id} initialRows={rows} initialSource={source} />;
}
