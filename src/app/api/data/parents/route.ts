import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { apiWriteError } from "@/lib/api/responses";
import { fetchAdminParentsResolved } from "@/lib/data/repositories/parents";
import {
  serverCreateParentInviteLink,
  serverDeleteParent,
  serverInsertParent,
  serverSetParentStudentLinks,
  serverUpdateParent,
} from "@/lib/data/server-writes";

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

export async function PATCH(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = (await req.json()) as Record<string, unknown>;
  const action = String(body.action ?? "");
  const parentId = String(body.parentId ?? "");

  if (action === "update-parent") {
    const result = await serverUpdateParent({
      parentId,
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
    });
    if (!result.ok) return apiWriteError(result.message, 400);
    return NextResponse.json({ parent: result.row });
  }

  if (action === "set-students") {
    const studentIds = Array.isArray(body.studentIds) ? body.studentIds.map((id) => String(id)) : [];
    const result = await serverSetParentStudentLinks({ parentId, studentIds });
    if (!result.ok) return apiWriteError(result.message, 400);
    return NextResponse.json({ parent: result.row });
  }

  if (action === "create-invite-link") {
    const origin = new URL(req.url).origin;
    const result = await serverCreateParentInviteLink({ parentId, origin });
    if (!result.ok) return apiWriteError(result.message, 400);
    return NextResponse.json({ parent: result.parent, inviteUrl: result.inviteUrl });
  }

  return apiWriteError("Unsupported parent action", 400);
}

export async function DELETE(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parentId") ?? searchParams.get("id") ?? "";
  const result = await serverDeleteParent(parentId);
  if (!result.ok) return apiWriteError(result.message, 400);
  return NextResponse.json({ ok: true });
}
