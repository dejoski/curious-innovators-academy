import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { fetchAdminClassOptionsResolved } from "@/lib/data/repositories/classes";

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { items: classes, source } = await fetchAdminClassOptionsResolved();
  return NextResponse.json({ classes, source });
}
