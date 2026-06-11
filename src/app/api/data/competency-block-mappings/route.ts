import { NextResponse } from "next/server";
import { apiWriteError } from "@/lib/api/responses";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import {
  fetchAdminCompetencyBlockSettingsResolved,
  replaceCompetencyBlockMappings,
} from "@/lib/data/repositories/competency-block-mappings";

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { groups, mappings, source } = await fetchAdminCompetencyBlockSettingsResolved();
  return NextResponse.json({ groups, mappings, source });
}

export async function PATCH(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = (await req.json()) as Record<string, unknown>;
  const result = await replaceCompetencyBlockMappings(body.mappings);
  if (!result.ok) return apiWriteError(result.message, 400);
  const refreshed = await fetchAdminCompetencyBlockSettingsResolved();
  return NextResponse.json(refreshed);
}
