import { fetchClassesResolved } from "@/lib/data/repositories/classes";
import ClassesPageClient from "../classes-client";

export default async function ClassesCheckPage() {
  const { items, source } = await fetchClassesResolved();
  return (
    <ClassesPageClient
      initialClasses={items}
      dataSource={source}
      initialTrack="enrichment"
      initialSelectedIds={["e-1", "e-3", "e-4"]}
    />
  );
}
