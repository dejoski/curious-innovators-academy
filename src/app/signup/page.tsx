import { redirect } from "next/navigation";

export default function DemoEntryRedirect() {
  redirect("/login");
}
