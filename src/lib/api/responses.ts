import { NextResponse } from "next/server";

export function statusFromWriteMessage(message: string): number {
  if (/supabase/i.test(message)) return 503;
  if (/sign/i.test(message)) return 401;
  return 400;
}

export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function apiWriteError(message: string, status = statusFromWriteMessage(message)): NextResponse {
  return apiError(message, status);
}

export function invalidIdResponse(message = "Invalid id"): NextResponse {
  return apiError(message, 400);
}
