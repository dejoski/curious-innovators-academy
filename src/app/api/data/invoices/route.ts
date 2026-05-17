import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "@/lib/api/require-auth";
import { fetchInvoicesResolved } from "@/lib/data/repositories/invoices";

export async function GET() {
  const authError = await requireRemoteApiSession();
  if (authError) return authError;

  const { items: invoices, source } = await fetchInvoicesResolved();
  return NextResponse.json({ invoices, source });
}
