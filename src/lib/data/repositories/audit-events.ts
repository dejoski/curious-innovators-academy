import "server-only";

import { requireAdminReadClient, type AdminReadClient } from "@/lib/api/admin-read";
import { isSupabaseConfigured, unavailableList } from "@/lib/data/env";
import type { ResolvedList } from "@/lib/data/fetch-source";
import { firstRel } from "@/lib/data/repositories/relations";

type AuditReadClient = AdminReadClient;

export type AuditEventExportRow = {
  id: string;
  actorProfileId?: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type AuditEventQueryOptions = {
  action?: string | null;
  entityType?: string | null;
  limit?: number | null;
};

const DEFAULT_AUDIT_LIMIT = 500;
const MAX_AUDIT_LIMIT = 2000;

function normalizeLimit(raw: number | null | undefined): number {
  if (raw == null) return DEFAULT_AUDIT_LIMIT;
  if (!Number.isFinite(raw)) return DEFAULT_AUDIT_LIMIT;
  return Math.max(1, Math.min(MAX_AUDIT_LIMIT, Math.floor(raw)));
}

function mapAuditEventRow(row: Record<string, unknown>): AuditEventExportRow | null {
  const id = String(row.id ?? "").trim();
  if (!id) return null;
  const actorProfile = firstRel<Record<string, unknown>>(row.actor_profile);
  const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? row.metadata as Record<string, unknown>
    : {};

  return {
    id,
    actorProfileId: String(row.actor_profile_id ?? "").trim() || undefined,
    actor: String(actorProfile?.display_name ?? actorProfile?.email ?? "").trim() || "Not recorded",
    action: String(row.action ?? "").trim(),
    entityType: String(row.entity_type ?? "").trim(),
    entityId: String(row.entity_id ?? "").trim(),
    metadata,
    createdAt: String(row.created_at ?? "").trim(),
  };
}

async function loadAuditEventsResolved(
  client: AuditReadClient,
  options?: AuditEventQueryOptions,
): Promise<ResolvedList<AuditEventExportRow>> {
  let query = client
    .from("audit_events")
    .select(
      `
      id,
      actor_profile_id,
      action,
      entity_type,
      entity_id,
      metadata,
      created_at,
      actor_profile:profiles!audit_events_actor_profile_id_fkey ( display_name, email )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(normalizeLimit(options?.limit));

  const action = String(options?.action ?? "").trim();
  if (action) query = query.eq("action", action);

  const entityType = String(options?.entityType ?? "").trim();
  if (entityType) query = query.eq("entity_type", entityType);

  const { data, error } = await query;
  if (error) return unavailableList();

  return {
    items: ((data ?? []) as unknown as Record<string, unknown>[])
      .map(mapAuditEventRow)
      .filter((row): row is AuditEventExportRow => row !== null),
    source: "remote",
  };
}

export async function fetchAdminAuditEventsResolved(
  options?: AuditEventQueryOptions,
): Promise<ResolvedList<AuditEventExportRow>> {
  if (!isSupabaseConfigured()) return unavailableList();
  const access = await requireAdminReadClient();
  if (!access) return unavailableList();
  return loadAuditEventsResolved(access.client, options);
}

function csvCell(value: unknown): string {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${raw.replace(/"/g, '""')}"`;
}

export function auditEventsToCsv(rows: AuditEventExportRow[]): string {
  const headers = [
    "id",
    "created_at",
    "actor_profile_id",
    "actor",
    "action",
    "entity_type",
    "entity_id",
    "metadata",
  ];
  return [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.id,
        row.createdAt,
        row.actorProfileId ?? "",
        row.actor,
        row.action,
        row.entityType,
        row.entityId,
        row.metadata,
      ].map(csvCell).join(","),
    ),
  ].join("\n");
}
