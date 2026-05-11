import { fetchStudentByIdResolved } from "@/lib/data/repositories/students";
import StudentProfileClient from "./student-profile-client";

type PageProps = { params: Promise<{ id: string }> };

export default async function StudentProfilePage({ params }: PageProps) {
  const { id } = await params;
  const { student, source } = await fetchStudentByIdResolved(id);
  return <StudentProfileClient studentId={id} directoryStudent={student} dataSource={source} />;
}
