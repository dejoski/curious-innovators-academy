import { fetchStudentsResolved } from "@/lib/data/repositories/students";
import StudentsStudentsList from "./students-client";

export default async function StudentsPage() {
  const { items, source } = await fetchStudentsResolved();
  return <StudentsStudentsList initialStudents={items} dataSource={source} />;
}
