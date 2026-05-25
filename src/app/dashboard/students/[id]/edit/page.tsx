import { fetchAdminStudentByIdResolved } from "@/lib/data/repositories/students";
import EditStudentClient from "./edit-student-client";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditStudentPage({ params }: PageProps) {
  const { id } = await params;
  const { student, source } = await fetchAdminStudentByIdResolved(id);
  return <EditStudentClient studentId={id} student={student} dataSource={source} />;
}
