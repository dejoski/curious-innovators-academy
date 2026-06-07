import { NextResponse } from "next/server";
import { loadCurrentApiUser, requireRemoteApiSession } from "@/lib/api/require-auth";
import { apiWriteError, invalidIdResponse } from "@/lib/api/responses";
import {
  serverDeleteStudent,
  serverInsertStudent,
  serverUpdateStudent,
} from "@/lib/data/server-writes";
import {
  fetchAdminStudentsResolved,
  fetchParentStudentsResolved,
  fetchStudentsResolved,
} from "@/lib/data/repositories/students";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseBody, parseIdFromSearchParams, handleWriteError, handleWriteSuccess } from "@/lib/api/route-factory";

export async function GET() {
  const current = await loadCurrentApiUser();
  if (current.error || !current.user || !current.supabase) {
    return NextResponse.json(
      { error: current.error ?? "Sign in required." },
      { status: current.status ?? 401 },
    );
  }

  const { data: profile } = await current.supabase
    .from("profiles")
    .select("role")
    .eq("id", current.user.id)
    .maybeSingle();

  if (String(profile?.role ?? "").toLowerCase() === "admin") {
    const { items: students, source } = await fetchAdminStudentsResolved();
    return NextResponse.json({ students, source });
  }

  if (String(profile?.role ?? "").toLowerCase() === "parent") {
    const { items: students, source } = await fetchParentStudentsResolved(createSupabaseAdminClient(), current.user.id);
    return NextResponse.json({ students, source });
  }

  const { items: students, source } = await fetchStudentsResolved();
  return NextResponse.json({ students, source });
}

export async function POST(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = await parseBody(req);
  const result = await serverInsertStudent({
    name: String(body.name ?? ""),
    parent: String(body.parent ?? ""),
    parentEmail: body.parentEmail != null ? String(body.parentEmail) : undefined,
    level: String(body.level ?? ""),
    track: body.track === "enrichment" ? "enrichment" : "core",
    notes: body.notes != null ? String(body.notes) : undefined,
  });
  return handleWriteSuccess(result, "student");
}

export async function PATCH(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const id = parseIdFromSearchParams(searchParams);
  if (!id) {
    return invalidIdResponse();
  }
  const body = await parseBody(req);
  const result = await serverUpdateStudent(id, {
    name: body.name != null ? String(body.name) : undefined,
    level: body.level != null ? String(body.level) : undefined,
    parent: body.parent != null ? String(body.parent) : undefined,
    parentEmail: body.parentEmail != null ? String(body.parentEmail) : undefined,
  });
  return handleWriteSuccess(result, "student");
}

export async function DELETE(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const id = parseIdFromSearchParams(searchParams);
  if (!id) {
    return invalidIdResponse();
  }
  const result = await serverDeleteStudent(id);
  return handleWriteError(result);
}
