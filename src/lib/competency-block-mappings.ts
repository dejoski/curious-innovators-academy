import { COMPETENCY_KEYS, displayCompetencyName, type CompetencyKey } from "@/lib/student-competency";
import type { ParentScheduleSlotKey } from "@/lib/schedule-slots";

export type CompetencyBlockNumber = 1 | 2 | 3 | 4;

export type CompetencyBlockMapping = {
  competency: CompetencyKey;
  level: string;
  blockNumber: CompetencyBlockNumber;
  block: string;
  updatedAt?: string;
};

export type CompetencyBlockGroup = {
  competency: CompetencyKey;
  level: string;
  blockNumber: CompetencyBlockNumber | null;
  block: string;
  studentCount: number;
  source: "student" | "mapping" | "both";
  updatedAt?: string;
};

export const COMPETENCY_BLOCK_NUMBERS: CompetencyBlockNumber[] = [1, 2, 3, 4];

export function normalizeCompetencyKey(raw: unknown): CompetencyKey | null {
  const value = String(raw ?? "").trim().toLowerCase();
  return (COMPETENCY_KEYS as readonly string[]).includes(value) ? (value as CompetencyKey) : null;
}

export function normalizeCompetencyLevel(raw: unknown): string {
  return String(raw ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeCompetencyBlockNumber(raw: unknown): CompetencyBlockNumber | null {
  const parsed = Number(String(raw ?? "").match(/[1-4]/)?.[0] ?? raw);
  return COMPETENCY_BLOCK_NUMBERS.includes(parsed as CompetencyBlockNumber)
    ? (parsed as CompetencyBlockNumber)
    : null;
}

export function competencyBlockLabel(blockNumber: CompetencyBlockNumber): string {
  return `Block ${blockNumber}`;
}

export function competencyMappingKey(competency: CompetencyKey, level: string): string {
  return `${competency}\u0000${normalizeCompetencyLevel(level).toLowerCase()}`;
}

export function competencyBlockDisplayName(competency: CompetencyKey, level: string): string {
  return `${displayCompetencyName(competency)} group ${level}`;
}

export function scheduleSlotsForCompetencyBlock(blockNumber: CompetencyBlockNumber): ParentScheduleSlotKey[] {
  if (blockNumber === 1) return ["b1Tue", "b1Wed", "b1Thu"];
  if (blockNumber === 2) return ["b2Tue", "b2Wed", "b2Thu"];
  if (blockNumber === 3) return ["b3Tue", "b3Wed", "b3Thu"];
  return ["b4Tue", "b4Wed", "b4Thu"];
}

export function normalizeCompetencyBlockMapping(raw: unknown): CompetencyBlockMapping | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const competency = normalizeCompetencyKey(record.competency);
  const level = normalizeCompetencyLevel(record.level);
  const blockNumber = normalizeCompetencyBlockNumber(record.blockNumber ?? record.block_number ?? record.block);
  if (!competency || !level || !blockNumber) return null;
  return {
    competency,
    level,
    blockNumber,
    block: competencyBlockLabel(blockNumber),
    updatedAt: String(record.updatedAt ?? record.updated_at ?? "").trim() || undefined,
  };
}
