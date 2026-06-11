import type { StudentCompetencyBehavior, StudentCompetencyLevel } from "@/lib/data/types";

export const COMPETENCY_KEYS = ["reading", "math"] as const;

export type CompetencyKey = (typeof COMPETENCY_KEYS)[number];

const COMPETENCY_DISPLAY_ORDER = new Map<string, number>([
  ["reading", 0],
  ["math", 1],
]);

function normalizeCompetencyName(raw: unknown): string {
  return String(raw ?? "").trim();
}

export function normalizeStudentCompetencyBehavior(raw: unknown): StudentCompetencyBehavior {
  const value = String(raw ?? "core").trim().toLowerCase();
  return value === "block" || value === "enrichment" ? value : "core";
}

export function displayCompetencyName(raw: string): string {
  const normalized = raw.trim().replace(/[_-]+/g, " ");
  if (!normalized) return "";
  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeStudentCompetencyLevels(raw: unknown): StudentCompetencyLevel[] {
  const rows = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  return rows
    .map((row) => ({
      competency: normalizeCompetencyName(row.competency),
      level: String(row.level ?? "").trim(),
      behavior: normalizeStudentCompetencyBehavior(row.behavior),
    }))
    .filter((row) => row.competency.length > 0 && row.level.length > 0)
    .sort((a, b) => {
      const orderA = COMPETENCY_DISPLAY_ORDER.get(a.competency.toLowerCase()) ?? 100;
      const orderB = COMPETENCY_DISPLAY_ORDER.get(b.competency.toLowerCase()) ?? 100;
      if (orderA !== orderB) return orderA - orderB;
      return a.competency.localeCompare(b.competency);
    });
}

export function summarizeStudentCompetencyLevels(
  levels: StudentCompetencyLevel[],
  fallbackLevel: string,
): string {
  if (levels.length === 0) return fallbackLevel.trim();
  return levels
    .map((row) => {
      const label = displayCompetencyName(row.competency);
      const suffix = row.behavior === "core" ? "" : ` (${row.behavior})`;
      return `${label} ${row.level}${suffix}`.trim();
    })
    .join(" · ");
}

export function competencyLevelFor(
  levels: StudentCompetencyLevel[],
  competency: CompetencyKey,
): StudentCompetencyLevel | null {
  return levels.find((row) => row.competency.trim().toLowerCase() === competency) ?? null;
}
