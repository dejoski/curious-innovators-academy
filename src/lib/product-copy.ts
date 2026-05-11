import { isDemoLoginUiEnabled } from "@/lib/demo-login";

/**
 * When demo-oriented features are disabled (`NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false`),
 * user-facing strings avoid the word "demo" (fallback data, login hints, etc.).
 */
export function isDemoAdjacentWording(): boolean {
  return isDemoLoginUiEnabled();
}

export function fallbackDirectoryBannerText(): string {
  return isDemoAdjacentWording()
    ? "Showing demo directory — cloud data unavailable or empty."
    : "Showing sample directory — live data is unavailable or empty.";
}

export function fallbackQueueBannerText(): string {
  return isDemoAdjacentWording()
    ? "Showing demo queue — cloud data unavailable or empty."
    : "Showing sample queue — live data is unavailable or empty.";
}

export function fallbackInboxBannerText(): string {
  return isDemoAdjacentWording()
    ? "Showing demo inbox — cloud data unavailable or empty."
    : "Showing sample inbox — live data is unavailable or empty.";
}

export function fallbackClassesStripText(): string {
  return isDemoAdjacentWording()
    ? "Demo directory preview — connect Supabase for live school data."
    : "Sample directory — connect Supabase for live school data.";
}

export function bundledMetricsBannerText(): string {
  return isDemoAdjacentWording()
    ? "Showing bundled demo metrics — connect Supabase tables (`students`, `teachers`, `classes` with `track`) for live counts."
    : "Showing sample metrics — connect Supabase tables (`students`, `teachers`, `classes` with `track`) for live counts.";
}

export function messagingDialogDisclaimer(): string {
  return isDemoAdjacentWording()
    ? "Nothing is sent in this demo."
    : "Messaging is not connected in this build.";
}

export function photoUploadUnavailableToast(): string {
  return isDemoAdjacentWording()
    ? "Photo uploads aren’t connected in this local demo."
    : "Photo uploads aren’t connected in this build.";
}

export function exportQueuedToast(): string {
  return isDemoAdjacentWording()
    ? "Prepared export preview (CSV). Download would start here in demo mode."
    : "Prepared export preview (CSV). Download would start here in production.";
}

/** Shown after failed POST when creating a student from the standalone form */
export function studentCreatePartialSaveHint(): string {
  return isDemoAdjacentWording()
    ? "Adding from the Students directory supports an offline preview row."
    : "Adding from the Students directory supports a local preview row until sync succeeds.";
}

/** Shown after failed POST when creating a teacher from the standalone form */
export function teacherCreateFailureExtraHint(): string {
  return isDemoAdjacentWording()
    ? "Creating from the Teachers directory supports an offline preview row when the API is unavailable."
    : "Creating from the Teachers directory supports a local preview row when the API is unavailable.";
}

/** Placeholder narrative for Learning profile when no LMS data was loaded. */
export function studentProfileLearningSample(): string {
  return isDemoAdjacentWording()
    ? "Sample learning strengths and growth areas appear here once connected to roster or LMS data."
    : "Learning highlights will appear once connected to roster or LMS data.";
}

/** Placeholder for student support notes when none exist. */
export function studentProfileSupportNotesPlaceholder(): string {
  return "No coordinator notes logged yet.";
}