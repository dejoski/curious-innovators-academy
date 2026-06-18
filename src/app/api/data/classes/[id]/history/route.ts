import { NextResponse } from "next/server";
import { loadCurrentApiUser } from "@/lib/api/require-auth";
import { fetchAdminClassSnapshotHistoryResolved } from "@/lib/data/repositories/history";

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
  if (String(profile?.role ?? "").toLowerCase() !== "admin") {
    return NextResponse.json({ error: "Administrator role required." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const { snapshots, source } = await fetchAdminClassSnapshotHistoryResolved(id, {
    limit: parseLimit(searchParams.get("limit")),
  });
  return NextResponse.json({ snapshots, source });
}
