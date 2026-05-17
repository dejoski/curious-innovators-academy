/**
 * Bundled fallback counts used only when the dashboard repository cannot read
 * live Supabase metrics.
 */
export const DASHBOARD_METRICS = {
  studentCount: 70,
  teacherCount: 12,
  coreClassCount: 16,
  enrichmentOfferingCount: 12,
} as const;

export type DashboardDailyBlockRow = {
  blockTitle: string;
  timeRange: string;
  trackType: "Core" | "Enrichment";
  /** Displayed as "{occupancyPercent}% Full" */
  occupancyPercent: number;
  withoutClassCount: number;
};

/** Head-count snapshot for stat cards and daily blocks (mock literals or REST counts). */
export type DashboardHeadCounts = {
  readonly studentCount: number;
  readonly teacherCount: number;
  readonly coreClassCount: number;
  readonly enrichmentOfferingCount: number;
};

/** Rows aligned with stat totals: without-class counts never exceed enrolled students. */
export function getDashboardDailyBlocks(
  m: DashboardHeadCounts,
): DashboardDailyBlockRow[] {
  const s = m.studentCount;
  const clamp = (n: number) => Math.min(Math.max(0, n), s);

  return [
    {
      blockTitle: "Block 01",
      timeRange: "8:00 am – 9:30 am",
      trackType: "Core",
      occupancyPercent: 70,
      withoutClassCount: clamp(3),
    },
    {
      blockTitle: "Block 02",
      timeRange: "9:40 am – 11:10 am",
      trackType: "Core",
      occupancyPercent: 95,
      withoutClassCount: clamp(0),
    },
    {
      blockTitle: "Block 03",
      timeRange: "1:00 pm – 1:30 pm",
      trackType: "Enrichment",
      occupancyPercent: 70,
      withoutClassCount: clamp(0),
    },
    {
      blockTitle: "Block 04",
      timeRange: "2:40 – 3:10 pm",
      trackType: "Enrichment",
      occupancyPercent: 70,
      withoutClassCount: clamp(3),
    },
  ];
}
