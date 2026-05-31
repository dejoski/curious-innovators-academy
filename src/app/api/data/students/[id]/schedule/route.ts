import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import {
  fetchAdminStudentScheduleResolved,
  fetchStudentScheduleResolved,
} from "@/lib/data/repositories/student-details";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const authError = await requireRemoteApiSession();
  if (authError) return authError;
  const { searchParams } = new URL(req.url);
  const options = { semesterId: searchParams.get("semesterId") };

  const adminRead = await fetchAdminStudentScheduleResolved(id, options);
  if (adminRead.source !== "unavailable") {
    return NextResponse.json(adminRead);
  }

  const { rows, source } = await fetchStudentScheduleResolved(id, undefined, options);
  return NextResponse.json({ rows, source });
}
