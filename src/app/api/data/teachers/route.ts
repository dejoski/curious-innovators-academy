import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { apiWriteError, invalidIdResponse } from "@/lib/api/responses";
import {
  serverDeleteTeacher,
  serverInsertTeacher,
  serverUpdateTeacher,
} from "@/lib/data/server-writes";
import { fetchTeachersResolved } from "@/lib/data/repositories/teachers";
import {
  parseBody,
  parseIdFromBody,
  parseIdFromSearchParams,
  handleWriteError,
  handleWriteSuccess,
} from "@/lib/api/route-factory";

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { items: teachers, source } = await fetchTeachersResolved();
  return NextResponse.json({ teachers, source });
}

export async function POST(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = await parseBody(req);
  const result = await serverInsertTeacher({
    name: String(body.name ?? ""),
    subjects: String(body.subjects ?? ""),
    email: String(body.email ?? ""),
    phone: body.phone != null ? String(body.phone) : undefined,
    program: body.program === "enrichment" ? "enrichment" : "core",
  });
  return handleWriteSuccess(result, "teacher");
}

export async function PATCH(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = await parseBody(req);
  const id = parseIdFromBody(body, "id");
  if (!id) {
    return invalidIdResponse();
  }
  const result = await serverUpdateTeacher(id, {
    name: String(body.name ?? ""),
    subjects: String(body.subjects ?? ""),
    email: String(body.email ?? ""),
    phone: String(body.phone ?? ""),
    program: body.program === "enrichment" ? "enrichment" : "core",
  });
  return handleWriteSuccess(result, "teacher");
}

export async function DELETE(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const id = parseIdFromSearchParams(searchParams);
  if (!id) {
    return invalidIdResponse();
  }
  const result = await serverDeleteTeacher(id);
  return handleWriteError(result);
}
