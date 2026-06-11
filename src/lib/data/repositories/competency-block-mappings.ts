import "server-only";

import type { DataSource } from "@/lib/data/fetch-source";
import { requireAdminReadClient, type AdminReadClient } from "@/lib/api/admin-read";
import { isSupabaseConfigured } from "@/lib/data/env";
import { isSupabaseAdminConfigured } from "@/lib/data/server-env";
import {
  competencyBlockLabel,
  competencyMappingKey,
  normalizeCompetencyBlockMapping,
  normalizeCompetencyBlockNumber,
  normalizeCompetencyKey,
  normalizeCompetencyLevel,
  type CompetencyBlockGroup,
  type CompetencyBlockMapping,
} from "@/lib/competency-block-mappings";
import type { StudentCompetencyLevel } from "@/lib/data/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type MappingReadClient = Pick<
  Awaited<ReturnType<typeof createSupabaseServerClient>> | AdminReadClient,
  "from"
>;

export type CompetencyBlockSettingsResolved = {
  groups: CompetencyBlockGroup[];
  mappings: CompetencyBlockMapping[];
  source: DataSource;
};

function unavailableSettings(): CompetencyBlockSettingsResolved {
  return { groups: [], mappings: [], source: "unavailable" };
}

function mapMappingRows(rows: unknown[] | null | undefined): CompetencyBlockMapping[] {
  return (rows ?? [])
    .map((row) => normalizeCompetencyBlockMapping(row))
    .filter((row): row is CompetencyBlockMapping => row !== null)
    .sort((a, b) => {
      if (a.competency !== b.competency) return a.competency.localeCompare(b.competency);
      return a.level.localeCompare(b.level, undefined, { numeric: true });
    });
}

function studentGroupCounts(rows: unknown[] | null | undefined): Map<string, CompetencyBlockGroup> {
  const groups = new Map<string, CompetencyBlockGroup>();
  for (const row of rows ?? []) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const competency = normalizeCompetencyKey(record.competency);
    const level = normalizeCompetencyLevel(record.level);
    if (!competency || !level) continue;
    const key = competencyMappingKey(competency, level);
    const current = groups.get(key);
    if (current) {
      current.studentCount += 1;
    } else {
      groups.set(key, {
        competency,
        level,
        blockNumber: null,
        block: "",
        studentCount: 1,
        source: "student",
      });
    }
  }
  return groups;
}

function mergeGroups(
  mappings: CompetencyBlockMapping[],
  studentRows: unknown[] | null | undefined,
): CompetencyBlockGroup[] {
  const groups = studentGroupCounts(studentRows);
  for (const mapping of mappings) {
    const key = competencyMappingKey(mapping.competency, mapping.level);
    const current = groups.get(key);
    if (current) {
      groups.set(key, {
        ...current,
        blockNumber: mapping.blockNumber,
        block: mapping.block,
        source: "both",
        updatedAt: mapping.updatedAt,
      });
    } else {
      groups.set(key, {
        competency: mapping.competency,
        level: mapping.level,
        blockNumber: mapping.blockNumber,
        block: mapping.block,
        studentCount: 0,
        source: "mapping",
        updatedAt: mapping.updatedAt,
      });
    }
  }
  return Array.from(groups.values()).sort((a, b) => {
    if (a.competency !== b.competency) return a.competency.localeCompare(b.competency);
    return a.level.localeCompare(b.level, undefined, { numeric: true });
  });
}

export async function fetchAdminCompetencyBlockSettingsResolved(): Promise<CompetencyBlockSettingsResolved> {
  if (!isSupabaseConfigured()) return unavailableSettings();
  const access = await requireAdminReadClient();
  if (!access) return unavailableSettings();

  try {
    const [mappingsResult, levelsResult] = await Promise.all([
      access.client
        .from("competency_block_mappings")
        .select("competency, level, block_number, updated_at")
        .order("competency", { ascending: true })
        .order("level", { ascending: true }),
      access.client
        .from("student_competency_levels")
        .select("competency, level"),
    ]);
    if (mappingsResult.error || levelsResult.error) return unavailableSettings();
    const mappings = mapMappingRows(mappingsResult.data as unknown[]);
    return {
      mappings,
      groups: mergeGroups(mappings, levelsResult.data as unknown[]),
      source: "remote",
    };
  } catch {
    return unavailableSettings();
  }
}

async function fetchMappingsByLevelFromClient(
  client: MappingReadClient,
  levels: StudentCompetencyLevel[],
): Promise<CompetencyBlockMapping[]> {
  const wanted = new Map<string, { competency: string; level: string }>();
  for (const level of levels) {
    const competency = normalizeCompetencyKey(level.competency);
    const normalizedLevel = normalizeCompetencyLevel(level.level);
    if (!competency || !normalizedLevel) continue;
    wanted.set(competencyMappingKey(competency, normalizedLevel), { competency, level: normalizedLevel });
  }
  if (wanted.size === 0) return [];

  const { data, error } = await client
    .from("competency_block_mappings")
    .select("competency, level, block_number, updated_at");
  if (error) return [];

  const wantedKeys = new Set(wanted.keys());
  return mapMappingRows(data as unknown[]).filter((row) =>
    wantedKeys.has(competencyMappingKey(row.competency, row.level)),
  );
}

export async function fetchCompetencyBlockMappingsForLevels(
  levels: StudentCompetencyLevel[],
): Promise<CompetencyBlockMapping[]> {
  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) return [];
  try {
    return fetchMappingsByLevelFromClient(createSupabaseAdminClient(), levels);
  } catch {
    return [];
  }
}

export async function replaceCompetencyBlockMappings(
  rows: unknown,
): Promise<{ ok: true; mappings: CompetencyBlockMapping[] } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable." };
  const inputRows = Array.isArray(rows) ? rows : [];
  const normalized = new Map<string, CompetencyBlockMapping>();
  for (const row of inputRows) {
    const mapping = normalizeCompetencyBlockMapping(row);
    if (!mapping) return { ok: false, message: "Each mapping needs a Reading or Math group and Block 1-4." };
    normalized.set(competencyMappingKey(mapping.competency, mapping.level), mapping);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return { ok: false, message: "Sign in required." };
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) return { ok: false, message: profileError.message };
    if (String(profile?.role ?? "").toLowerCase() !== "admin") {
      return { ok: false, message: "Only admins can update competency block mappings." };
    }

    const { error: deleteError } = await supabase.from("competency_block_mappings").delete().neq("competency", "");
    if (deleteError) return { ok: false, message: deleteError.message };

    const payload = Array.from(normalized.values()).map((mapping) => ({
      competency: mapping.competency,
      level: mapping.level,
      block_number: normalizeCompetencyBlockNumber(mapping.blockNumber),
      updated_at: new Date().toISOString(),
    }));
    if (payload.length > 0) {
      const { error: insertError } = await supabase.from("competency_block_mappings").insert(payload);
      if (insertError) return { ok: false, message: insertError.message };
    }

    try {
      await supabase.from("audit_events").insert({
        actor_profile_id: user.id,
        action: "competency_block_mappings.replace",
        entity_type: "settings",
        entity_id: "competency_block_mappings",
        metadata: { mappingCount: payload.length },
      });
    } catch {
      /* Audit writes should not block settings updates. */
    }

    return {
      ok: true,
      mappings: Array.from(normalized.values()).map((mapping) => ({
        ...mapping,
        block: competencyBlockLabel(mapping.blockNumber),
      })),
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
