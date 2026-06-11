import { isTestPersonaSwitcherEnabled } from "@/lib/product-ui-flags";

export async function GET() {
  const env = process.env as Record<string, string | undefined>;
  const signupInvite = env.NEXT_PUBLIC_SIGNUP_INVITE_CODE?.trim() || "";
  const demoLoginEnabled = env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN?.trim() === "true";

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
