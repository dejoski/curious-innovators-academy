import { NextResponse } from "next/server";
import { fetchEnrichmentRequestsResolved } from "@/lib/data/repositories/requests";
import { serverPatchEnrichmentRequest } from "@/lib/data/server-writes";
import type { EnrichmentRequestRow } from "@/lib/data/types";

export async function GET() {
  const { items: requests, source } = await fetchEnrichmentRequestsResolved();
  return NextResponse.json({ requests, source });
}

export async function PATCH(req: Request) {
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
