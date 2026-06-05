/**
 * Sample-mode wording is used consistently across the app so local demo fallback
 * user-facing strings avoid the word "demo" (fallback data, login hints, etc.).
 */
export function isDemoAdjacentWording(): boolean {
  return false;
}

export function fallbackDirectoryBannerText(): string {
  return "Showing a starter directory while school records finish loading.";
}

export function fallbackQueueBannerText(): string {
  return "Showing a starter queue while school requests finish loading.";
}

export function fallbackInboxBannerText(): string {
  return "Notifications are temporarily unavailable.";
}

export function studentCreatePartialSaveHint(): string {
  return "No student record was created. Check the connection and try again.";
}

/** Shown after failed POST when creating a teacher from the standalone form */
export function teacherCreateFailureExtraHint(): string {
  return "No teacher record was created. Check the connection and try again.";
}
