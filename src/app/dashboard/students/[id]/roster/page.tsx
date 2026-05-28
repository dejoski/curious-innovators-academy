import { fetchAdminStudentRosterResolved } from "@/lib/data/repositories/student-details";
import StudentRosterClient from "./student-roster-client";

type PageProps = { params: Promise<{ id: string }> };

export default async function StudentRosterPage({ params }: PageProps) {
  const { id } = await params;
  const { items, source } = await fetchAdminStudentRosterResolved(id);
  return <StudentRosterClient studentId={id} initialStudents={items} initialSource={source} />;
}
