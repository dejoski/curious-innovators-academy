import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { apiWriteError, invalidIdResponse } from "@/lib/api/responses";
import { fetchAdminParentsResolved } from "@/lib/data/repositories/parents";
import {
  serverCreateParentInviteLink,
  serverDeleteParent,
  serverInsertParent,
  serverSetParentStudentLinks,
  serverUpdateParent,
} from "@/lib/data/server-writes";
import {
  parseBody,
  parseIdFromBody,
  parseIdFromSearchParams,
  handleWriteError,
  handleWriteSuccess,
} from "@/lib/api/route-factory";

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { items: parents, source } = await fetchAdminParentsResolved();
  return NextResponse.json({ parents, source });
}

export async function POST(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = await parseBody(req);
  const result = await serverInsertParent({
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
  });
  return handleWriteSuccess(result, "parent");
}

export async function PATCH(req: Request) {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const body = await parseBody(req);
  const action = String(body.action ?? "");
  const parentId = String(body.parentId ?? "");

  if (action === "update-parent") {
    const result = await serverUpdateParent({
      parentId,
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
    });
    return handleWriteSuccess(result, "parent");
  }

  if (action === "set-students") {
    const studentIds = Array.isArray(body.studentIds) ? body.studentIds.map((id: unknown) => String(id)) : [];
    const result = await serverSetParentStudentLinks({ parentId, studentIds });
    return handleWriteSuccess(result, "parent");
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
  const parentId = parseIdFromSearchParams(searchParams, "parentId");
  const result = await serverDeleteParent(parentId);
  return handleWriteError(result);
}
