import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { apiWriteError, invalidIdResponse } from "@/lib/api/responses";
import {
  serverDeleteClass,
  serverInsertClass,
  serverUpdateClass,
} from "@/lib/data/server-writes";
import { fetchClassesResolved } from "@/lib/data/repositories/classes";

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { items: classes, source } = await fetchClassesResolved();
  return NextResponse.json({ classes, source });
}

export async function POST(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = (await req.json()) as Record<string, unknown>;
  const result = await serverInsertClass({
    name: String(body.name ?? ""),
    teacher: String(body.teacher ?? ""),
    students: String(body.students ?? "0/1"),
    schedule: String(body.schedule ?? ""),
    status: body.status === "Full" ? "Full" : "Active",
    track: body.track === "enrichment" ? "enrichment" : "core",
    description: body.description != null ? String(body.description) : undefined,
    level: body.level != null ? String(body.level) : undefined,
    block: body.block != null ? String(body.block) : undefined,
  });
  if (!result.ok) {
    return apiWriteError(result.message);
  }
  return NextResponse.json({ class: result.row });
}

export async function PATCH(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = (await req.json()) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return invalidIdResponse();
  }
  const result = await serverUpdateClass(id, {
    name: String(body.name ?? ""),
    teacher: String(body.teacher ?? ""),
    students: String(body.students ?? "0/1"),
    schedule: String(body.schedule ?? ""),
    status: body.status === "Full" ? "Full" : "Active",
    track: body.track === "enrichment" ? "enrichment" : "core",
    description: body.description != null ? String(body.description) : undefined,
    level: body.level != null ? String(body.level) : undefined,
    block: body.block != null ? String(body.block) : undefined,
  });
  if (!result.ok) {
    return apiWriteError(result.message);
  }
  return NextResponse.json({ class: result.row });
}

export async function DELETE(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return invalidIdResponse();
  }
  const result = await serverDeleteClass(id);
  if (!result.ok) {
    return apiWriteError(result.message);
  }
  return NextResponse.json({ ok: true });
}
