import { NextResponse } from "next/server";
import {
  serverDeleteClass,
  serverInsertClass,
  serverUpdateClass,
} from "@/lib/data/server-writes";
import { fetchClassesResolved } from "@/lib/data/repositories/classes";

export async function GET() {
  const { items: classes, source } = await fetchClassesResolved();
  return NextResponse.json({ classes, source });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  const result = await serverInsertClass({
    name: String(body.name ?? ""),
    teacher: String(body.teacher ?? ""),
    students: String(body.students ?? "0/1"),
    schedule: String(body.schedule ?? ""),
    status: body.status === "Full" ? "Full" : "Active",
    track: body.track === "enrichment" ? "enrichment" : "core",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ class: result.row });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const result = await serverUpdateClass(id, {
    name: String(body.name ?? ""),
    teacher: String(body.teacher ?? ""),
    students: String(body.students ?? "0/1"),
    schedule: String(body.schedule ?? ""),
    status: body.status === "Full" ? "Full" : "Active",
    track: body.track === "enrichment" ? "enrichment" : "core",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ class: result.row });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const result = await serverDeleteClass(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
