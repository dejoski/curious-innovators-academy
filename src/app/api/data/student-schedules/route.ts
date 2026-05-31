import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { fetchAdminStudentSchedulesResolved } from "@/lib/data/repositories/student-details";

export async function GET(request: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const { rows, source } = await fetchAdminStudentSchedulesResolved({
    semesterId: searchParams.get("semesterId"),
  });
  return NextResponse.json({ rows, source });
}
