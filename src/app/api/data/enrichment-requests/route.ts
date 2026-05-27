import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { apiError, apiWriteError } from "@/lib/api/responses";
import {
  fetchEnrichmentDecisionSummaryResolved,
  fetchEnrichmentRequestsResolved,
} from "@/lib/data/repositories/requests";
import {
  serverInsertEnrichmentRequests,
  serverPatchEnrichmentRequest,
} from "@/lib/data/server-writes";
import type { EnrichmentRequestRow } from "@/lib/data/types";

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const [{ items: requests, source }, decisionSummary] = await Promise.all([
    fetchEnrichmentRequestsResolved(),
    fetchEnrichmentDecisionSummaryResolved(),
  ]);
  return NextResponse.json({ requests, source, decisionSummary });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  const rawChoices = Array.isArray(body.choices) ? body.choices : [];
  const choices = rawChoices.map((raw) => {
    const choice = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    return {
      classId: String(choice.classId ?? ""),
      block: String(choice.block ?? ""),
      level: String(choice.level ?? ""),
      option: String(choice.option ?? ""),
    };
  });
  const result = await serverInsertEnrichmentRequests({
    studentId: body.studentId != null ? String(body.studentId) : undefined,
    choices,
  });
  if (!result.ok) {
    return apiWriteError(result.message, 400);
  }
  return NextResponse.json({ requests: result.rows });
}

export async function PATCH(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = (await req.json()) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const status = body.status as EnrichmentRequestRow["status"] | undefined;
  if (!id || !status) {
    return apiError("Invalid payload");
  }
  if (status !== "Approved" && status !== "Rejected" && status !== "Pending" && status !== "Waitlisted") {
    return apiError("Invalid status");
  }
  const result = await serverPatchEnrichmentRequest(id, status);
  if (!result.ok) {
    return apiWriteError(result.message, 400);
  }
  return NextResponse.json({ request: result.row });
}
