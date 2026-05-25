import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { apiWriteError, invalidIdResponse } from "@/lib/api/responses";
import {
  serverDeleteStudent,
  serverInsertStudent,
  serverUpdateStudent,
} from "@/lib/data/server-writes";
import { fetchStudentsResolved } from "@/lib/data/repositories/students";

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { items: students, source } = await fetchStudentsResolved();
  return NextResponse.json({ students, source });
}

export async function POST(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = (await req.json()) as Record<string, unknown>;
  const result = await serverInsertStudent({
    name: String(body.name ?? ""),
    parent: String(body.parent ?? ""),
    level: String(body.level ?? ""),
    track: body.track === "enrichment" ? "enrichment" : "core",
    notes: body.notes != null ? String(body.notes) : undefined,
  });
  if (!result.ok) {
    return apiWriteError(result.message, 400);
  }
  return NextResponse.json({ student: result.row });
}

export async function PATCH(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return invalidIdResponse();
  }
  const body = (await req.json()) as Record<string, unknown>;
  const result = await serverUpdateStudent(id, {
    name: body.name != null ? String(body.name) : undefined,
    level: body.level != null ? String(body.level) : undefined,
    parent: body.parent != null ? String(body.parent) : undefined,
    parentEmail: body.parentEmail != null ? String(body.parentEmail) : undefined,
  });
  if (!result.ok) {
    return apiWriteError(result.message, 400);
  }
  return NextResponse.json({ student: result.row });
}

export async function DELETE(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return invalidIdResponse();
  }
  const result = await serverDeleteStudent(id);
  if (!result.ok) {
    return apiWriteError(result.message, 400);
  }
  return NextResponse.json({ ok: true });
}
