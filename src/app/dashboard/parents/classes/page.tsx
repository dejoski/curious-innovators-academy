import { redirect } from "next/navigation";

/** Parent class list IA: land on the core list; tabs switch to enrichment. */
export default function ParentClassesIndexPage() {
  redirect("/dashboard/parents/classes/core");
}
