import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { auditEventsToCsv, fetchAdminAuditEventsResolved } from "@/lib/data/repositories/audit-events";

function parseLimit(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const result = await fetchAdminAuditEventsResolved({
    action: searchParams.get("action"),
    entityType: searchParams.get("entityType"),
    limit: parseLimit(searchParams.get("limit")),
  });

  if (searchParams.get("format") === "csv") {
    return new NextResponse(auditEventsToCsv(result.items), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="audit-events.csv"',
      },
    });
  }

  return NextResponse.json({ auditEvents: result.items, source: result.source });
}
