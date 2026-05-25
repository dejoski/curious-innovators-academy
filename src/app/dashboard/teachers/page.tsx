import { fetchAdminTeachersResolved } from "@/lib/data/repositories/teachers";
import TeachersTeacherList from "./teachers-client";

export default async function TeachersPage() {
  const { items, source } = await fetchAdminTeachersResolved();
  return <TeachersTeacherList initialTeachers={items} dataSource={source} />;
}
