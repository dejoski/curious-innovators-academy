import { isTestPersonaSwitcherEnabled } from "@/lib/product-ui-flags";

function hasDemoCredential(env: Record<string, string | undefined>, privateKey: string, legacyPublicKey: string): boolean {
  return Boolean(env[privateKey]?.trim() || env[legacyPublicKey]?.trim());
}

export async function GET() {
  const env = process.env as Record<string, string | undefined>;
  const signupInvite = env.NEXT_PUBLIC_SIGNUP_INVITE_CODE?.trim() || "";
  const demoLoginEnabled =
    hasDemoCredential(env, "DEMO_ADMIN_EMAIL", "NEXT_PUBLIC_DEMO_ADMIN_EMAIL") &&
    hasDemoCredential(env, "DEMO_ADMIN_PASSWORD", "NEXT_PUBLIC_DEMO_ADMIN_PASSWORD") &&
    hasDemoCredential(env, "DEMO_PARENT_EMAIL", "NEXT_PUBLIC_DEMO_PARENT_EMAIL") &&
    hasDemoCredential(env, "DEMO_PARENT_PASSWORD", "NEXT_PUBLIC_DEMO_PARENT_PASSWORD");

  return Response.json({
    ok: true,
    service: "curious-innovators-academy",
    productionGuards: {
      requireRemoteData: true,
      demoLoginDisabled: !demoLoginEnabled,
      testPersonaUiDisabled: !isTestPersonaSwitcherEnabled(),
      mockNotificationHeaderDisabled:
        env.NEXT_PUBLIC_ENABLE_MOCK_NOTIFICATION_HEADER?.trim() !== "true",
      signupInviteConfigured: Boolean(signupInvite && signupInvite !== "CIA-DEMO-2026"),
    },
  });
}
