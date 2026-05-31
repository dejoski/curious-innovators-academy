import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { apiWriteError, invalidIdResponse } from "@/lib/api/responses";
import {
  serverDeleteClass,
  serverInsertClass,
  serverUpdateClass,
} from "@/lib/data/server-writes";
import { fetchClassesResolved } from "@/lib/data/repositories/classes";

function plannerFields(body: Record<string, unknown>) {
  return {
    plannerSubject: body.plannerSubject != null ? String(body.plannerSubject) : undefined,
    plannerSummary: body.plannerSummary != null ? String(body.plannerSummary) : undefined,
    teacherGuideObjectives: body.teacherGuideObjectives != null ? String(body.teacherGuideObjectives) : undefined,
    teacherGuideInformation: body.teacherGuideInformation != null ? String(body.teacherGuideInformation) : undefined,
    teacherGuideSummary: body.teacherGuideSummary != null ? String(body.teacherGuideSummary) : undefined,
    studentGuideObjectives: body.studentGuideObjectives != null ? String(body.studentGuideObjectives) : undefined,
    studentGuideInformation: body.studentGuideInformation != null ? String(body.studentGuideInformation) : undefined,
    studentGuideSummary: body.studentGuideSummary != null ? String(body.studentGuideSummary) : undefined,
  };
}

function capacityField(body: Record<string, unknown>) {
  const direct = Number(body.capacity);
  if (Number.isFinite(direct) && direct > 0) return Math.floor(direct);
  const legacy = String(body.students ?? "").trim();
  const match = /^\d+\s*\/\s*(\d+)$/.exec(legacy);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

export async function GET(request: Request) {
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
    capacity: capacityField(body),
    schedule: String(body.schedule ?? ""),
    status: body.status === "Full" ? "Full" : "Active",
    track: body.track === "enrichment" ? "enrichment" : "core",
    description: body.description != null ? String(body.description) : undefined,
    level: body.level != null ? String(body.level) : undefined,
    block: body.block != null ? String(body.block) : undefined,
    ...plannerFields(body),
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
    capacity: capacityField(body),
    schedule: String(body.schedule ?? ""),
    status: body.status === "Full" ? "Full" : "Active",
    track: body.track === "enrichment" ? "enrichment" : "core",
    description: body.description != null ? String(body.description) : undefined,
    level: body.level != null ? String(body.level) : undefined,
    block: body.block != null ? String(body.block) : undefined,
    ...plannerFields(body),
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
