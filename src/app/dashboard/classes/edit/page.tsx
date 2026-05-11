import { redirect } from "next/navigation";

/** Placeholder segment for route checker (`router.push` prefix before dynamic parts). */
export default function EditClassIndexPage() {
  redirect("/dashboard/classes");
}
