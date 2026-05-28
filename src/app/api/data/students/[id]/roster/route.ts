import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import {
  fetchAdminStudentRosterResolved,
  fetchStudentRosterResolved,
} from "@/lib/data/repositories/student-details";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const adminRead = await fetchAdminStudentRosterResolved(id);
  if (adminRead.source !== "unavailable") {
    return NextResponse.json({ students: adminRead.items, source: adminRead.source });
  }

  const { items: students, source } = await fetchStudentRosterResolved(id);
  return NextResponse.json({ students, source });
}
