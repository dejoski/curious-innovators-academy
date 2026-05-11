/**
 * Invite gate for public signup. Client-readable (NEXT_PUBLIC_*); not a secret —
 * set `NEXT_PUBLIC_SIGNUP_INVITE_CODE` in production or rely on the documented default
 * (change or rotate for real deployments; disable open signup in Supabase policies if needed).
 */
export const PUBLIC_SIGNUP_INVITE_DEFAULT = "CIA-DEMO-2026";

export function getExpectedSignupInviteCode(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SIGNUP_INVITE_CODE?.trim();
  return fromEnv || PUBLIC_SIGNUP_INVITE_DEFAULT;
}

export function inviteCodesMatch(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  return trimmed === getExpectedSignupInviteCode().trim();
}
