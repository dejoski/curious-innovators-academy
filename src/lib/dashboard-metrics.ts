export type DashboardDailyBlockRow = {
  blockTitle: string;
  timeRange: string;
  trackType: "Core" | "Enrichment";
  /** Displayed as "{occupancyPercent}% Full" */
  occupancyPercent: number;
  withoutClassCount: number;
};

/** Head-count snapshot for stat cards. */
export type DashboardHeadCounts = {
  readonly studentCount: number;
  readonly teacherCount: number;
  readonly coreClassCount: number;
  readonly enrichmentOfferingCount: number;
};

/** Real daily block rollups are not inferred from head counts. */
export function getDashboardDailyBlocks(): DashboardDailyBlockRow[] {
  return [];
}
