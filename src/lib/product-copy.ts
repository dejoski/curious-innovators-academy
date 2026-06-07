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

function writeFailureHint(entity: string): string {
  return `${entity} record was not created. Check the connection and try again.`;
}

export function studentCreatePartialSaveHint(): string {
  return writeFailureHint("student");
}

export function teacherCreateFailureExtraHint(): string {
  return writeFailureHint("teacher");
}
