import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { fetchEnrichmentRequestsResolved } from "@/lib/data/repositories/requests";
import {
  serverInsertEnrichmentRequests,
  serverPatchEnrichmentRequest,
} from "@/lib/data/server-writes";
import type { EnrichmentRequestRow } from "@/lib/data/types";

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { items: requests, source } = await fetchEnrichmentRequestsResolved();
  return NextResponse.json({ requests, source });
}

export async function POST(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

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
    return NextResponse.json({ error: result.message }, { status: 400 });
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
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (status !== "Approved" && status !== "Rejected" && status !== "Pending") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const result = await serverPatchEnrichmentRequest(id, status);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ request: result.row });
}
