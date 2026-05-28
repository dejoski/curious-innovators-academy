import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { apiWriteError } from "@/lib/api/responses";
import { fetchAdminParentsResolved } from "@/lib/data/repositories/parents";
import { serverInsertParent } from "@/lib/data/server-writes";

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { items: parents, source } = await fetchAdminParentsResolved();
  return NextResponse.json({ parents, source });
}

export async function POST(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = (await req.json()) as Record<string, unknown>;
  const result = await serverInsertParent({
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
  });
  if (!result.ok) {
    return apiWriteError(result.message, 400);
  }
  return NextResponse.json({ parent: result.row });
}
