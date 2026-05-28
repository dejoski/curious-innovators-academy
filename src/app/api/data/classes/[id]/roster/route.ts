import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { apiWriteError } from "@/lib/api/responses";
import { fetchClassRosterResolved } from "@/lib/data/repositories/classes";
import {
  serverDeleteEnrollment,
  serverInsertRosterStudent,
  serverPatchEnrollmentStatus,
  serverUpdateRosterStudent,
} from "@/lib/data/server-writes";
import type { ClassRosterStatus } from "@/lib/data/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { id } = await context.params;
  const { items: students, source } = await fetchClassRosterResolved(id);
  return NextResponse.json({ students, source });
}

export async function POST(req: Request, context: RouteContext) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { id } = await context.params;
  const body = (await req.json()) as Record<string, unknown>;
  const statusRaw = String(body.status ?? "").trim();
  const status: ClassRosterStatus =
    statusRaw === "Approved"
      ? "Approved"
      : statusRaw === "Waitlisted" || statusRaw === "Waitlist"
        ? "Waitlisted"
        : statusRaw === "Rejected"
          ? "Rejected"
          : "Pending";
  const result = await serverInsertRosterStudent({
    classId: id,
    studentId: body.studentId == null ? undefined : String(body.studentId),
    name: String(body.name ?? ""),
    parent: String(body.parent ?? ""),
    age: body.age == null ? undefined : Number(body.age),
    level: String(body.level ?? ""),
    status,
    description: body.description == null ? undefined : String(body.description),
  });
  if (!result.ok) {
    return apiWriteError(result.message);
  }
  return NextResponse.json({ student: result.row }, { status: 201 });
}

export async function PATCH(req: Request, context: RouteContext) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { id } = await context.params;
  const body = (await req.json()) as Record<string, unknown>;
  const studentId = String(body.studentId ?? "").trim();
  const statusRaw = String(body.status ?? "").trim();
  const status: ClassRosterStatus =
    statusRaw === "Approved"
      ? "Approved"
      : statusRaw === "Waitlisted" || statusRaw === "Waitlist"
        ? "Waitlisted"
        : statusRaw === "Rejected"
          ? "Rejected"
          : "Pending";
  const updatesStudent =
    body.name != null ||
    body.parent != null ||
    body.age != null ||
    body.level != null ||
    body.description != null;
  if (updatesStudent) {
    const result = await serverUpdateRosterStudent({
      classId: id,
      studentId,
      name: body.name == null ? undefined : String(body.name),
      parent: body.parent == null ? undefined : String(body.parent),
      age: body.age == null ? undefined : Number(body.age),
      level: body.level == null ? undefined : String(body.level),
      status,
      description: body.description == null ? undefined : String(body.description),
    });
    if (!result.ok) {
      return apiWriteError(result.message);
    }
    return NextResponse.json({ student: result.row });
  }
  const result = await serverPatchEnrollmentStatus({ classId: id, studentId, status });
  if (!result.ok) {
    return apiWriteError(result.message);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, context: RouteContext) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { id } = await context.params;
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId")?.trim() ?? "";
  const result = await serverDeleteEnrollment({ classId: id, studentId });
  if (!result.ok) {
    return apiWriteError(result.message);
  }
  return NextResponse.json({ ok: true });
}
