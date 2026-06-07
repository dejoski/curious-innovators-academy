import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { apiWriteError, invalidIdResponse } from "@/lib/api/responses";
import { fetchSemestersResolved } from "@/lib/data/repositories/semesters";
import { serverUpdateSemester } from "@/lib/data/server-writes";
import { parseBody, parseIdFromBody, handleWriteSuccess } from "@/lib/api/route-factory";

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { semesters, currentSemester, source } = await fetchSemestersResolved();
  return NextResponse.json({ semesters, currentSemester, source });
}

export async function PATCH(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = await parseBody(req);
  const id = parseIdFromBody(body);
  if (!id) return invalidIdResponse();

  const result = await serverUpdateSemester({
    id,
    name: String(body.name ?? ""),
    startsOn: String(body.startsOn ?? ""),
    endsOn: String(body.endsOn ?? ""),
    isCurrent: Boolean(body.isCurrent),
  });
  return handleWriteSuccess(result, "semester");
}
