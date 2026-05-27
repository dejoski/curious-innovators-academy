import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { fetchApprovalHistoryResolved } from "@/lib/data/repositories/requests";

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { items: approvals, source } = await fetchApprovalHistoryResolved();
  return NextResponse.json({ approvals, source });
}
