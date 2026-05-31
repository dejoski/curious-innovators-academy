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

export function fallbackClassesStripText(): string {
  return "Showing a starter class list while school records finish loading.";
}

export function bundledMetricsBannerText(): string {
  return "Showing starter metrics while school records finish loading.";
}

export function messagingDialogDisclaimer(): string {
  return isDemoAdjacentWording()
    ? "Your mail app opens a draft; nothing is sent until you send it."
    : "Your mail app opens a draft; nothing is sent until you send it.";
}

export function exportQueuedToast(): string {
  return isDemoAdjacentWording()
    ? "CSV download started."
    : "CSV download started.";
}

/** Shown after failed POST when creating a student from the standalone form */
export function studentCreatePartialSaveHint(): string {
  return "No student record was created. Check the connection and try again.";
}

/** Shown after failed POST when creating a teacher from the standalone form */
export function teacherCreateFailureExtraHint(): string {
  return "No teacher record was created. Check the connection and try again.";
}

/** Placeholder narrative for Learning profile when no LMS data was loaded. */
export function studentProfileLearningSample(): string {
  return "Learning highlights will appear once student records are available.";
}

/** Placeholder for student support notes when none exist. */
export function studentProfileSupportNotesPlaceholder(): string {
  return "No coordinator notes logged yet.";
}
