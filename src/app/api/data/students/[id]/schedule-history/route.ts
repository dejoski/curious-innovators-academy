import { NextResponse } from "next/server";
import { isParentRole, requireParentStudentAccess } from "@/lib/api/parent-access";
import { loadCurrentApiUser } from "@/lib/api/require-auth";
import {
  fetchAdminStudentScheduleHistoryResolved,
  fetchStudentScheduleHistoryResolved,
} from "@/lib/data/repositories/history";

type RouteContext = { params: Promise<{ id: string }> };

function parseLimit(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(1, Math.min(100, Math.floor(parsed)));
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

  const { data: profile, error: profileError } = await current.supabase
    .from("profiles")
    .select("role")
    .eq("id", current.user.id)
    .maybeSingle();
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const options = {
    semesterId: searchParams.get("semesterId"),
    limit: parseLimit(searchParams.get("limit")),
  };

  if (isParentRole(profile?.role)) {
    const access = await requireParentStudentAccess(current.user.id, id);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const { snapshots, source } = await fetchStudentScheduleHistoryResolved(id, access.client, options);
    return NextResponse.json({ snapshots, source });
  }

  if (String(profile?.role ?? "").toLowerCase() !== "admin") {
    return NextResponse.json({ error: "Only linked parents or administrators can read this student schedule history." }, { status: 403 });
  }

  const { snapshots, source } = await fetchAdminStudentScheduleHistoryResolved(id, options);
  return NextResponse.json({ snapshots, source });
}
