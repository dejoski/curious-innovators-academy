import { fetchClassesResolved } from "@/lib/data/repositories/classes";
import ClassesPageClient from "../classes-client";

export default async function EnrichmentClassesListPage() {
  const { items, source } = await fetchClassesResolved();
  return <ClassesPageClient initialClasses={items} dataSource={source} initialTrack="enrichment" />;
}
