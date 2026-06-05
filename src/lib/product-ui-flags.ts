/**
 * Non–design-system / QA UI toggles. All default off unless explicitly set to `"true"`
 * so production builds stay client-facing without tester chrome.
 */

/** In-dashboard role switching is retired; use sign-out + login/demo entry instead. */
export function isTestPersonaSwitcherEnabled(): boolean {
  return false;
}

/** Header bell dropdown preview. When false, bell links to `/dashboard/notifications`. */
export function isNotificationDropdownEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ENABLE_NOTIFICATION_HEADER === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_MOCK_NOTIFICATION_HEADER === "true"
  );
}

/** Small non-prod-only header chrome, such as sandbox labels. */
export function isSandboxHeaderIndicatorEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

/** @deprecated Use `isNotificationDropdownEnabled`; the dropdown now reads notifications from the data API. */
export const isMockNotificationDropdownEnabled = isNotificationDropdownEnabled;
