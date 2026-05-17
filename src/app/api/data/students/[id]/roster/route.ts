import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { fetchStudentRosterResolved } from "@/lib/data/repositories/student-details";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { id } = await context.params;
  const { items: students, source } = await fetchStudentRosterResolved(id);
  return NextResponse.json({ students, source });
}
