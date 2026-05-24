import { redirect } from "next/navigation";

type ParentClassesIndexPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

/** Parent class list IA: land on the core list; tabs switch to enrichment. */
export default async function ParentClassesIndexPage({
  searchParams,
}: ParentClassesIndexPageProps) {
  const params = searchParams ? await searchParams : {};
  const studentId = firstParam(params.student).trim();
  const query = studentId ? `?student=${encodeURIComponent(studentId)}` : "";
  redirect(`/dashboard/parents/classes/core${query}`);
}
