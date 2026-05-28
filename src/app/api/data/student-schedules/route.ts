import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { fetchAdminStudentSchedulesResolved } from "@/lib/data/repositories/student-details";

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { rows, source } = await fetchAdminStudentSchedulesResolved();
  return NextResponse.json({ rows, source });
}
