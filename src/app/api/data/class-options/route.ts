import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { fetchAdminClassOptionsResolved } from "@/lib/data/repositories/classes";

export async function GET(request: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const { items: classes, source } = await fetchAdminClassOptionsResolved({
    semesterId: searchParams.get("semesterId"),
  });
  return NextResponse.json({ classes, source });
}
