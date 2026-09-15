import { redirect } from "next/navigation";
import { BookOpen, CalendarDays, MapPin } from "lucide-react";
import AdminWorkspacePage from "../admin-workspace-page";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/env";

export default async function TeachersPage() {
  if (!isSupabaseConfigured()) redirect("/login?auth=configuration");
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login?auth=required");
  const { data: profile } = await db.from("profiles").select("role, display_name").eq("id", user.id).maybeSingle();
  if (profile?.role === "admin") return <AdminWorkspacePage initialView="teachers" />;
  if (profile?.role !== "teacher") redirect("/dashboard/parents/home");
  const { data: teacher } = await db.from("teachers").select("id").eq("profile_id", user.id).maybeSingle();
  const result = teacher ? await db.from("classes").select("id, name, schedule_summary, location, enrollments(status, students(id, display_name))").eq("teacher_id", teacher.id).eq("is_active", true).order("name") : null;
  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <p className="text-sm font-medium text-[#47705b]">Teacher workspace</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#18332f]">Your classroom, connected.</h1>
      <p className="mt-3 text-sm text-[#526761]">Welcome, {profile.display_name}. Here are your assigned classes and enrolled students.</p>
      {result?.error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-800">Your classes could not be loaded. Please try again.</p>}
      {!result?.error && !result?.data?.length && <p className="mt-8 rounded-xl border bg-white p-6 text-[#526761]">No classes assigned yet. An administrator can assign classes in the school workspace.</p>}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {result?.data?.map((schoolClass) => (
          <section key={schoolClass.id} className="rounded-2xl border border-[#dce5df] bg-white p-6">
            <BookOpen className="mb-4 text-[#47705b]" size={24} />
            <h2 className="text-xl font-semibold text-[#18332f]">{schoolClass.name}</h2>
            <p className="mt-3 flex items-center gap-2 text-sm text-[#526761]"><CalendarDays size={16} />{schoolClass.schedule_summary || "Schedule to be confirmed"}</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-[#526761]"><MapPin size={16} />{schoolClass.location || "Room to be confirmed"}</p>
            <h3 className="mt-6 border-t pt-4 text-sm font-semibold">Student roster</h3>
            <ul className="mt-2 space-y-2 text-sm text-[#526761]">
              {schoolClass.enrollments?.filter((e) => e.status === "approved").flatMap((e) => e.students ?? []).map((student) => <li key={student.id}>{student.display_name}</li>)}
            </ul>
            {!schoolClass.enrollments?.some((e) => e.status === "approved") && <p className="mt-2 text-sm text-[#526761]">No enrolled students yet.</p>}
          </section>
        ))}
      </div>
    </div>
  );
}
