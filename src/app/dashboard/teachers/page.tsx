import { fetchTeachersResolved } from "@/lib/data/repositories/teachers";
import TeachersTeacherList from "./teachers-client";

export default async function TeachersPage() {
  const { items, source } = await fetchTeachersResolved();
  return <TeachersTeacherList initialTeachers={items} dataSource={source} />;
}
