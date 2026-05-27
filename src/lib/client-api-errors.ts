export async function readApiError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return sanitizeClientApiError(body.error ?? res.statusText);
  } catch {
    return sanitizeClientApiError(res.statusText);
  }
}

function sanitizeClientApiError(message: string): string {
  return message
    .replace(/Supabase/gi, "the school system")
    .replace(/database/gi, "school records")
    .replace(/cloud/gi, "online")
    .replace(/env(?:ironment)?/gi, "setup")
    .replace(/\s+/g, " ")
    .trim();
}
