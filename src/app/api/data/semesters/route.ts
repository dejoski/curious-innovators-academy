import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { apiWriteError, invalidIdResponse } from "@/lib/api/responses";
import { fetchSemestersResolved } from "@/lib/data/repositories/semesters";
import { serverUpdateSemester } from "@/lib/data/server-writes";

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { semesters, currentSemester, source } = await fetchSemestersResolved();
  return NextResponse.json({ semesters, currentSemester, source });
}

export async function PATCH(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  // fallow-ignore-next-line code-duplication
  const body = (await req.json()) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  // fallow-ignore-next-line code-duplication
  if (!id) return invalidIdResponse();

  const result = await serverUpdateSemester({
    id,
    name: String(body.name ?? ""),
    startsOn: String(body.startsOn ?? ""),
    endsOn: String(body.endsOn ?? ""),
    isCurrent: Boolean(body.isCurrent),
  });
  // fallow-ignore-next-line code-duplication
  if (!result.ok) return apiWriteError(result.message);
  // fallow-ignore-next-line code-duplication
  return NextResponse.json({ semester: result.row });
}
