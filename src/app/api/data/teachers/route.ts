import { NextResponse } from "next/server";
import {
  serverDeleteTeacher,
  serverInsertTeacher,
  serverUpdateTeacher,
} from "@/lib/data/server-writes";
import { fetchTeachersResolved } from "@/lib/data/repositories/teachers";

export async function GET() {
  const { items: teachers, source } = await fetchTeachersResolved();
  return NextResponse.json({ teachers, source });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  const result = await serverInsertTeacher({
    name: String(body.name ?? ""),
    subjects: String(body.subjects ?? ""),
    email: String(body.email ?? ""),
    phone: body.phone != null ? String(body.phone) : undefined,
    program: body.program === "enrichment" ? "enrichment" : "core",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ teacher: result.row });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const result = await serverUpdateTeacher(id, {
    name: String(body.name ?? ""),
    subjects: String(body.subjects ?? ""),
    email: String(body.email ?? ""),
    phone: String(body.phone ?? ""),
    program: body.program === "enrichment" ? "enrichment" : "core",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ teacher: result.row });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const result = await serverDeleteTeacher(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
