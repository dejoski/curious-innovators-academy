import { redirect } from "next/navigation";

/** Parent “Class List” IA: land on the Figma-derived core list (tabs switch to Enrichment). */
export default function ParentClassesIndexPage() {
  redirect("/dashboard/parents/classes/core");
}
