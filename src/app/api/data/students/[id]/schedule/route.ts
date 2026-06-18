import { NextResponse } from "next/server";
import { isParentRole, requireParentStudentAccess } from "@/lib/api/parent-access";
import { loadCurrentApiUser } from "@/lib/api/require-auth";
import {
  fetchAdminStudentScheduleResolved,
  fetchStudentScheduleResolved,
  recordTeacherScheduleConflictOverrideResolved,
  updateStudentScheduleStateResolved,
} from "@/lib/data/repositories/student-details";
import type { StudentScheduleState } from "@/lib/data/types";

type RouteContext = { params: Promise<{ id: string }> };

function parseScheduleState(raw: unknown): StudentScheduleState | null {
  const state = String(raw ?? "").trim().toLowerCase();
  if (state === "draft" || state === "pending" || state === "finalized") return state;
  return null;
}

function parseTeacherConflictOverride(raw: Record<string, unknown> | null): {
  teacherId: string;
  slot: string;
  classIds: string[];
  reason?: string | null;
} | null {
  const source = raw?.teacherConflictOverride && typeof raw.teacherConflictOverride === "object"
    ? raw.teacherConflictOverride as Record<string, unknown>
    : raw;
  if (String(raw?.action ?? "").trim() !== "recordTeacherConflictOverride" && !raw?.teacherConflictOverride) {
    return null;
  }
  const teacherId = String(source?.teacherId ?? source?.teacher_id ?? "").trim();
  const slot = String(source?.slot ?? "").trim();
  const classIdsRaw = source?.classIds ?? source?.class_ids;
  const classIds = Array.isArray(classIdsRaw)
    ? classIdsRaw.map((value) => String(value ?? "").trim()).filter(Boolean)
    : [];
  return {
    teacherId,
    slot,
    classIds,
    reason: String(source?.reason ?? "").trim() || null,
  };
}

async function requireAdminScheduleMutation(current: { supabase: NonNullable<Awaited<ReturnType<typeof loadCurrentApiUser>>["supabase"]>; user: { id: string } }) {
  const { data: profileRow, error } = await current.supabase
    .from("profiles")
    .select("role")
    .eq("id", current.user.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (String(profileRow?.role ?? "").toLowerCase() !== "admin") {
    return NextResponse.json({ error: "Administrator role required." }, { status: 403 });
  }
  return null;
}

export async function GET(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const current = await loadCurrentApiUser();
  if (current.error || !current.user || !current.supabase) {
    return NextResponse.json(
      { error: current.error ?? "Sign in required." },
      { status: current.status ?? 401 },
    );
  }
  const { searchParams } = new URL(req.url);
  const options = { semesterId: searchParams.get("semesterId") };

  const { data: profile } = await current.supabase
    .from("profiles")
    .select("role")
    .eq("id", current.user.id)
    .maybeSingle();

  if (isParentRole(profile?.role)) {
    const access = await requireParentStudentAccess(current.user.id, id);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const { rows, source } = await fetchStudentScheduleResolved(id, access.client, options);
    return NextResponse.json({ rows, source });
  }

  const adminRead = await fetchAdminStudentScheduleResolved(id, options);
  if (adminRead.source !== "unavailable") {
    return NextResponse.json(adminRead);
  }

  const { rows, source } = await fetchStudentScheduleResolved(id, undefined, options);
  return NextResponse.json({ rows, source });
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const current = await loadCurrentApiUser();
  if (current.error || !current.user || !current.supabase) {
    return NextResponse.json(
      { error: current.error ?? "Sign in required." },
      { status: current.status ?? 401 },
    );
  }
  const adminCheck = await requireAdminScheduleMutation({ supabase: current.supabase, user: current.user });
  if (adminCheck) return adminCheck;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const teacherConflictOverride = parseTeacherConflictOverride(body);
  if (teacherConflictOverride) {
    const { searchParams } = new URL(req.url);
    const result = await recordTeacherScheduleConflictOverrideResolved(id, {
      ...teacherConflictOverride,
      semesterId: searchParams.get("semesterId"),
      recordedByProfileId: current.user.id,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    return NextResponse.json({ rows: result.rows, source: result.source, overrideId: result.overrideId });
  }

  const state = parseScheduleState(body?.state);
  if (!state) {
    return NextResponse.json({ error: "Schedule state must be draft, pending, or finalized." }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const result = await updateStudentScheduleStateResolved(id, state, {
    semesterId: searchParams.get("semesterId"),
    finalizedByProfileId: current.user.id,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ rows: result.rows, source: result.source });
}
