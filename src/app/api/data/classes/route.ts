import { NextResponse } from "next/server";
import { isParentRole, resolveParentAccess } from "@/lib/api/parent-access";
import { loadCurrentApiUser, requireRemoteApiSession } from "@/lib/api/require-auth";
import { apiWriteError, invalidIdResponse } from "@/lib/api/responses";
import {
  serverDeleteClass,
  serverInsertClass,
  serverSetClassLifecycle,
  serverUpdateClass,
} from "@/lib/data/server-writes";
import { fetchClassesForClientResolved, fetchClassesResolved } from "@/lib/data/repositories/classes";
import { parseBody, parseIdFromBody, parseIdFromSearchParams, handleWriteError, handleWriteSuccess } from "@/lib/api/route-factory";

function capacityField(body: Record<string, unknown>) {
  const direct = Number(body.capacity);
  if (Number.isFinite(direct) && direct > 0) return Math.floor(direct);
  const legacy = String(body.students ?? "").trim();
  const match = /^\d+\s*\/\s*(\d+)$/.exec(legacy);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

function programField(body: Record<string, unknown>) {
  return body.program === "enrichment" || body.track === "enrichment" ? "enrichment" : "core";
}

export async function GET(request: Request) {
  const current = await loadCurrentApiUser();
  if (current.error || !current.user || !current.supabase) {
    return NextResponse.json(
      { error: current.error ?? "Sign in required." },
      { status: current.status ?? 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const options = {
    semesterId: searchParams.get("semesterId"),
  };
  const { data: profile } = await current.supabase
    .from("profiles")
    .select("role")
    .eq("id", current.user.id)
    .maybeSingle();

  if (isParentRole(profile?.role)) {
    const access = await resolveParentAccess(current.user.id);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const { items: classes, source } = await fetchClassesForClientResolved(access.client, options);
    return NextResponse.json({ classes, source });
  }

  const { items: classes, source } = await fetchClassesResolved(options);
  return NextResponse.json({ classes, source });
}

export async function POST(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = await parseBody(req);
  const result = await serverInsertClass({
    name: String(body.name ?? ""),
    teacher: String(body.teacher ?? ""),
    semesterId: body.semesterId != null ? String(body.semesterId) : undefined,
    capacity: capacityField(body),
    schedule: String(body.schedule ?? ""),
    status: body.status === "Full" ? "Full" : "Active",
    isActive: body.isActive == null ? undefined : Boolean(body.isActive),
    archivedAt: body.archivedAt == null ? undefined : String(body.archivedAt),
    track: programField(body),
    description: body.description != null ? String(body.description) : undefined,
    level: body.level != null ? String(body.level) : undefined,
    block: body.block != null ? String(body.block) : undefined,
    scheduleDays: Array.isArray(body.scheduleDays) ? body.scheduleDays.map(String) : undefined,
    location: body.location != null ? String(body.location) : undefined,
    room: body.room != null ? String(body.room) : undefined,
    minAgeYears: body.minAgeYears == null ? undefined : Number(body.minAgeYears),
    maxAgeYears: body.maxAgeYears == null ? undefined : Number(body.maxAgeYears),
  });
  if (!result.ok) return apiWriteError(result.message);
  return NextResponse.json({ class: result.row });
}

export async function PATCH(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = await parseBody(req);
  const id = parseIdFromBody(body);
  if (!id) {
    return invalidIdResponse();
  }
  if (body.lifecycle === "activate" || body.lifecycle === "deactivate" || body.lifecycle === "archive") {
    const result = await serverSetClassLifecycle(id, {
      isActive: body.lifecycle === "activate",
      archived: body.lifecycle === "archive",
    });
    if (!result.ok) return apiWriteError(result.message);
    return NextResponse.json({ class: result.row });
  }
  const result = await serverUpdateClass(id, {
    name: String(body.name ?? ""),
    teacher: String(body.teacher ?? ""),
    semesterId: body.semesterId != null ? String(body.semesterId) : undefined,
    capacity: capacityField(body),
    schedule: String(body.schedule ?? ""),
    status: body.status === "Full" ? "Full" : "Active",
    isActive: body.isActive == null ? undefined : Boolean(body.isActive),
    archivedAt: body.archivedAt == null ? undefined : String(body.archivedAt),
    track: programField(body),
    description: body.description != null ? String(body.description) : undefined,
    level: body.level != null ? String(body.level) : undefined,
    block: body.block != null ? String(body.block) : undefined,
    scheduleDays: Array.isArray(body.scheduleDays) ? body.scheduleDays.map(String) : undefined,
    location: body.location != null ? String(body.location) : undefined,
    room: body.room != null ? String(body.room) : undefined,
    minAgeYears: body.minAgeYears == null ? undefined : Number(body.minAgeYears),
    maxAgeYears: body.maxAgeYears == null ? undefined : Number(body.maxAgeYears),
  });
  return handleWriteSuccess(result, "class");
}

export async function DELETE(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const id = parseIdFromSearchParams(searchParams);
  if (!id) {
    return invalidIdResponse();
  }
  const result = await serverDeleteClass(id);
  return handleWriteError(result);
}
