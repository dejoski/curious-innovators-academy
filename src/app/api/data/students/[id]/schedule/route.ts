import { NextResponse } from "next/server";
import { localDemoRoleFromRequest } from "@/lib/api/local-demo";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { demoParentCanAccessStudent } from "@/lib/data/repositories/demo-parent";
import { fetchStudentScheduleResolved } from "@/lib/data/repositories/student-details";
import { isSupabaseAdminConfigured } from "@/lib/data/server-env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const demoRole = localDemoRoleFromRequest(req);
  if (demoRole === "admin" || (demoRole === "parent" && await demoParentCanAccessStudent(id))) {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ rows: [], source: "unavailable" });
    }
    const { rows, source } = await fetchStudentScheduleResolved(id, createSupabaseAdminClient());
    return NextResponse.json({ rows, source });
  }

  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { rows, source } = await fetchStudentScheduleResolved(id);
  return NextResponse.json({ rows, source });
}
