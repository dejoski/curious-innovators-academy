import { NextResponse } from "next/server";

export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function apiWriteError(message: string, status = 400): NextResponse {
  if (/supabase/i.test(message)) status = 503;
  else if (/sign/i.test(message)) status = 401;
  return apiError(message, status);
}

export function invalidIdResponse(message = "Invalid id"): NextResponse {
  return apiError(message, 400);
}
