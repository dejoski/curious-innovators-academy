import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { fetchAdminParentsResolved } from "@/lib/data/repositories/parents";

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { items: parents, source } = await fetchAdminParentsResolved();
  return NextResponse.json({ parents, source });
}
