import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { resolveDashboardPresentation } from "@/lib/data/repositories/dashboard";

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const presentation = await resolveDashboardPresentation();
  return NextResponse.json(presentation);
}
