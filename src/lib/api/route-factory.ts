import { NextResponse } from "next/server";
import { requireRemoteApiSession } from "./require-auth";
import { apiWriteError, invalidIdResponse } from "./responses";

type FetchResult = { items: unknown; source: string };

export function createGetRoute(
  fetchFn: () => Promise<FetchResult & Record<string, unknown>>,
  responseKey: string,
) {
  return async function GET() {
    const authError = await requireRemoteApiSession();
    if (authError) return authError;
    const { items: data, source } = await fetchFn();
    return NextResponse.json({ [responseKey]: data, source });
  };
}

export async function parseBody(req: Request): Promise<Record<string, unknown>> {
  return (await req.json()) as Record<string, unknown>;
}

export function parseIdFromBody(body: Record<string, unknown>, field: string = "id"): string {
  const raw = body[field];
  if (typeof raw !== "string") return "";
  return raw.trim();
}

export function parseIdFromSearchParams(searchParams: URLSearchParams, fallback?: string): string {
  const id = searchParams.get(fallback ?? "id") ?? searchParams.get("id") ?? "";
  return typeof id === "string" ? id.trim() : "";
}

export function handleWriteError(result: { ok: boolean; message?: string; row?: Record<string, unknown> }) {
  if (!result.ok) return apiWriteError(result.message ?? "Write failed", 400);
  return NextResponse.json({ ok: true });
}

export function handleWriteSuccess(result: { ok: boolean; message?: string; row?: Record<string, unknown> }, key: string) {
  if (!result.ok) return apiWriteError(result.message ?? "Write failed", 400);
  return NextResponse.json({ [key]: result.row });
}
