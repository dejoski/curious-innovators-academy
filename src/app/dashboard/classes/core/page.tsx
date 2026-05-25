import { fetchAdminClassesResolved } from "@/lib/data/repositories/classes";
import ClassesPageClient from "../classes-client";

export default async function CoreClassesListPage() {
  const { items, source } = await fetchAdminClassesResolved();
  return <ClassesPageClient initialClasses={items} dataSource={source} initialTrack="core" />;
}
