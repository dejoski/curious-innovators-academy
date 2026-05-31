import { NextResponse } from "next/server";
import { isParentRole, requireParentStudentAccess } from "@/lib/api/parent-access";
import { loadCurrentApiUser } from "@/lib/api/require-auth";
import {
  fetchAdminStudentScheduleResolved,
  fetchStudentScheduleResolved,
} from "@/lib/data/repositories/student-details";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const current = await loadCurrentApiUser();
  if (current.error || !current.user || !current.supabase) {
    return NextResponse.json(
      { error: current.error ?? "Sign in required." },
      { status: current.status ?? 401 },
    );
  }
  const { searchParams } = new URL(req.url);
  const options = { semesterId: searchParams.get("semesterId") };

  const { data: profile } = await current.supabase
    .from("profiles")
    .select("role")
    .eq("id", current.user.id)
    .maybeSingle();

  if (isParentRole(profile?.role)) {
    const access = await requireParentStudentAccess(current.user.id, id);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const { rows, source } = await fetchStudentScheduleResolved(id, access.client, options);
    return NextResponse.json({ rows, source });
  }

  const adminRead = await fetchAdminStudentScheduleResolved(id, options);
  if (adminRead.source !== "unavailable") {
    return NextResponse.json(adminRead);
  }

  const { rows, source } = await fetchStudentScheduleResolved(id, undefined, options);
  return NextResponse.json({ rows, source });
}
