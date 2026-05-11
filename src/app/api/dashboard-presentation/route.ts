import { NextResponse } from "next/server";
import { resolveDashboardPresentation } from "@/lib/data/repositories/dashboard";

export async function GET() {
  const presentation = await resolveDashboardPresentation();
  return NextResponse.json(presentation);
}
