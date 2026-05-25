import { fetchAdminStudentsResolved } from "@/lib/data/repositories/students";
import StudentsStudentsList from "./students-client";

export default async function StudentsPage() {
  const { items, source } = await fetchAdminStudentsResolved();
  return <StudentsStudentsList initialStudents={items} dataSource={source} />;
}
