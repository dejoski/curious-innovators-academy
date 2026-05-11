/**
 * Non–design-system / QA UI toggles. All default off unless explicitly set to `"true"`
 * so production builds stay client-facing without tester chrome.
 */

/** Dashboard header persona switcher (+ localStorage persona for sidebar). QA only. */
export function isTestPersonaSwitcherEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_TEST_PERSONA_UI === "true";
}

/** Header bell: mock unread badge + dropdown seeds. When false, bell links to `/dashboard/notifications`. */
export function isMockNotificationDropdownEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_MOCK_NOTIFICATION_HEADER === "true";
}
