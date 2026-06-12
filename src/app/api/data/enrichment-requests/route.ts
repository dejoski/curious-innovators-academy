import { NextResponse } from "next/server";
import { isParentRole, resolveParentAccess } from "@/lib/api/parent-access";
import { loadCurrentApiUser, requireRemoteApiSession } from "@/lib/api/require-auth";
import { apiError, apiWriteError } from "@/lib/api/responses";
import {
  fetchEnrichmentDecisionSummaryForClientResolved,
  fetchEnrichmentDecisionSummaryResolved,
  fetchEnrichmentRequestsForClientResolved,
  fetchEnrichmentRequestsResolved,
} from "@/lib/data/repositories/requests";
import {
  serverDeleteEnrichmentRequest,
  serverInsertEnrichmentRequests,
  serverPatchEnrichmentRequest,
} from "@/lib/data/server-writes";
import type { EnrichmentRequestRow } from "@/lib/data/types";
import { parseBody, parseIdFromBody, parseIdFromSearchParams } from "@/lib/api/route-factory";

export async function GET(request: Request) {
  const current = await loadCurrentApiUser();
  if (current.error || !current.user || !current.supabase) {
    return NextResponse.json(
      { error: current.error ?? "Sign in required." },
      { status: current.status ?? 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const options = { semesterId: searchParams.get("semesterId") };
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
    const [{ items: requests, source }, decisionSummary] = await Promise.all([
      fetchEnrichmentRequestsForClientResolved(access.client, {
        ...options,
        studentIds: access.studentIds,
      }),
      fetchEnrichmentDecisionSummaryForClientResolved(access.client, access.studentIds),
    ]);
    return NextResponse.json({ requests, source, decisionSummary });
  }

  const [{ items: requests, source }, decisionSummary] = await Promise.all([
    fetchEnrichmentRequestsResolved(options),
    fetchEnrichmentDecisionSummaryResolved(),
  ]);
  return NextResponse.json({ requests, source, decisionSummary });
}

export async function POST(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = await parseBody(req);
  const rawChoices = Array.isArray(body.choices) ? body.choices : [];
  const choices = rawChoices.map((raw) => {
    const choice = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    return {
      classId: String(choice.classId ?? ""),
      block: String(choice.block ?? ""),
      level: String(choice.level ?? ""),
      option: String(choice.option ?? ""),
      waitlist: choice.waitlist === true,
    };
  });
  const submitScope = body.submitScope === "choice" ? "choice" : "slot";
  const result = await serverInsertEnrichmentRequests({
    studentId: body.studentId != null ? String(body.studentId) : undefined,
    choices,
    submitScope,
    allowAgeOverride: body.allowAgeOverride === true,
  });
  if (!result.ok) {
    return apiWriteError(result.message, 400);
  }
  return NextResponse.json({ requests: result.rows });
}

export async function PATCH(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = await parseBody(req);
  const id = parseIdFromBody(body);
  const status = body.status as EnrichmentRequestRow["status"] | undefined;
  if (!id || !status) {
    return apiError("Invalid payload");
  }
  if (status !== "Approved" && status !== "Rejected" && status !== "Pending" && status !== "Waitlisted") {
    return apiError("Invalid status");
  }
  const reason = typeof body.reason === "string" ? body.reason : undefined;
  const result = await serverPatchEnrichmentRequest(id, status, { reason });
  if (!result.ok) {
    return apiWriteError(result.message, 400);
  }
  return NextResponse.json({ request: result.row });
}

export async function DELETE(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  let id = parseIdFromSearchParams(searchParams);
  let reason = searchParams.get("reason")?.trim() || undefined;
  if (!id) {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    id = typeof body?.id === "string" ? body.id.trim() : "";
    reason = typeof body?.reason === "string" ? body.reason : reason;
  }
  if (!id) return apiError("Invalid payload");

  const result = await serverDeleteEnrichmentRequest(id, { reason });
  if (!result.ok) {
    return apiWriteError(result.message, 400);
  }
  return NextResponse.json({ ok: true });
}
