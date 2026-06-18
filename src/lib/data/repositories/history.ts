import "server-only";

import type { DataSource } from "@/lib/data/fetch-source";
import { requireAdminReadClient, type AdminReadClient } from "@/lib/api/admin-read";
import { isSupabaseConfigured } from "@/lib/data/env";
import type {
  ProgramTrack,
  ScheduleConflict,
  SchoolClassRow,
  StudentScheduleBadge,
  StudentScheduleRow,
  StudentScheduleState,
} from "@/lib/data/types";
import { mapClassRow } from "@/lib/data/repositories/classes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type HistoryClient = Pick<
  Awaited<ReturnType<typeof createSupabaseServerClient>> | AdminReadClient,
  "from"
>;

type HistoryQueryOptions = {
  semesterId?: string | null;
  limit?: number | string | null;
};

type RecordSnapshotOptions = {
  semesterId?: string | null;
  recordedByProfileId?: string | null;
  reason?: string | null;
  sourceAction?: string | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
};

type SnapshotWriteResult<T> =
  | { ok: true; snapshot: T | null; source: DataSource }
  | { ok: false; message: string; source: DataSource };

const STUDENT_SCHEDULE_SNAPSHOTS_TABLE = "student_schedule_snapshots";
const CLASS_SNAPSHOTS_TABLE = "class_snapshots";

const STUDENT_SCHEDULE_SLOT_KEYS = [
  "b1",
  "b1Tue",
  "b1Wed",
  "b1Thu",
  "b2",
  "b2Tue",
  "b2Wed",
  "b2Thu",
  "b3Tue",
  "b3Wed",
  "b3Thu",
  "b4Tue",
  "b4Wed",
  "b4Thu",
] as const;

type StudentScheduleSnapshotSlotKey = (typeof STUDENT_SCHEDULE_SLOT_KEYS)[number];

const STUDENT_SCHEDULE_SLOT_DB_KEYS: Record<StudentScheduleSnapshotSlotKey, string> = {
  b1: "b1",
  b1Tue: "b1_tue",
  b1Wed: "b1_wed",
  b1Thu: "b1_thu",
  b2: "b2",
  b2Tue: "b2_tue",
  b2Wed: "b2_wed",
  b2Thu: "b2_thu",
  b3Tue: "b3_tue",
  b3Wed: "b3_wed",
  b3Thu: "b3_thu",
  b4Tue: "b4_tue",
  b4Wed: "b4_wed",
  b4Thu: "b4_thu",
};

const STUDENT_SCHEDULE_TONES = new Set<StudentScheduleBadge["tone"]>([
  "core",
  "approved",
  "pending",
  "waitlisted",
  "draft",
  "empty",
]);

export type StudentScheduleSnapshotResponseRow = {
  snapshotId: string;
  studentId: string;
  semesterId?: string;
  recordedAt: string;
  recordedByProfileId?: string;
  reason?: string;
  scheduleState: StudentScheduleState;
  finalizedAt?: string;
  incompleteBlocks?: number;
  hasConflicts: boolean;
  conflicts: ScheduleConflict[];
} & Record<StudentScheduleSnapshotSlotKey, StudentScheduleBadge[]>;

export type ClassSnapshotResponseRow = {
  snapshotId: string;
  id: string;
  classId: string;
  semesterId?: string;
  semesterName?: string;
  recordedAt: string;
  recordedByProfileId?: string;
  reason?: string;
  name: string;
  program: ProgramTrack;
  teacherId?: string;
  teacher: string;
  block: string;
  level: string;
  schedule: string;
  scheduleDays: string[];
  room?: string;
  location?: string;
  status?: SchoolClassRow["status"] | string;
  isActive: boolean;
  archivedAt?: string;
  minAgeYears?: number;
  maxAgeYears?: number;
  capacity?: number;
};

export type StudentScheduleHistoryResolved = {
  snapshots: StudentScheduleSnapshotResponseRow[];
  source: DataSource;
};

export type ClassSnapshotHistoryResolved = {
  snapshots: ClassSnapshotResponseRow[];
  source: DataSource;
};

function unavailableStudentHistory(): StudentScheduleHistoryResolved {
  return { snapshots: [], source: "unavailable" };
}

function unavailableClassHistory(): ClassSnapshotHistoryResolved {
  return { snapshots: [], source: "unavailable" };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(...values: unknown[]): string {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function optionalStringValue(...values: unknown[]): string | undefined {
  return stringValue(...values) || undefined;
}

function nullableStringValue(...values: unknown[]): string | null {
  return stringValue(...values) || null;
}

function stringOrDefault(value: unknown, fallback: string): string {
  return stringValue(value) || fallback;
}

function numberValue(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (value == null || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
  }
  return undefined;
}

function booleanValue(...values: unknown[]): boolean {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string" && value.trim()) {
      const normalized = value.trim().toLowerCase();
      if (["true", "t", "1", "yes", "y"].includes(normalized)) return true;
      if (["false", "f", "0", "no", "n"].includes(normalized)) return false;
    }
  }
  return false;
}

function jsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeProgram(raw: unknown): ProgramTrack {
  return String(raw ?? "").toLowerCase() === "enrichment" ? "enrichment" : "core";
}

function normalizeScheduleState(raw: unknown): StudentScheduleState {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "finalized") return "finalized";
  if (value === "pending") return "pending";
  return "draft";
}

function normalizeLimit(raw: HistoryQueryOptions["limit"], fallback = 20): number {
  const parsed = Number(raw ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(100, Math.floor(parsed)));
}

function mapBadge(raw: unknown): StudentScheduleBadge | null {
  const row = objectValue(raw);
  const label = stringValue(row.label);
  const toneRaw = stringValue(row.tone);
  if (!label || !STUDENT_SCHEDULE_TONES.has(toneRaw as StudentScheduleBadge["tone"])) return null;
  const draftOf = objectValue(row.draftOf ?? row.draft_of);
  const draftOfLabel = stringValue(draftOf.label);
  const draftOfTone = stringValue(draftOf.tone);
  const badge: StudentScheduleBadge = {
    label,
    tone: toneRaw as StudentScheduleBadge["tone"],
    classId: optionalStringValue(row.classId, row.class_id),
    teacherId: optionalStringValue(row.teacherId, row.teacher_id),
    teacher: optionalStringValue(row.teacher),
    requestId: optionalStringValue(row.requestId, row.request_id),
    draftKind: stringValue(row.draftKind, row.draft_kind) === "change" ? "change" : stringValue(row.draftKind, row.draft_kind) === "choice" ? "choice" : undefined,
    draftOf: draftOfLabel && STUDENT_SCHEDULE_TONES.has(draftOfTone as StudentScheduleBadge["tone"])
      ? { label: draftOfLabel, tone: draftOfTone as StudentScheduleBadge["tone"] }
      : undefined,
  };
  return badge;
}

function mapBadges(raw: unknown): StudentScheduleBadge[] {
  return jsonArray(raw).map(mapBadge).filter((badge): badge is StudentScheduleBadge => badge !== null);
}

function mapConflict(raw: unknown): ScheduleConflict | null {
  const row = objectValue(raw);
  const kind = stringValue(row.kind);
  const label = stringValue(row.label);
  const detail = stringValue(row.detail);
  if (!kind || !label || !detail) return null;
  if (!["student", "teacher", "capacity", "override"].includes(kind)) return null;
  return {
    kind: kind as ScheduleConflict["kind"],
    label,
    detail,
    classId: optionalStringValue(row.classId, row.class_id),
    className: optionalStringValue(row.className, row.class_name),
    teacherId: optionalStringValue(row.teacherId, row.teacher_id),
    teacher: optionalStringValue(row.teacher),
    requestId: optionalStringValue(row.requestId, row.request_id),
    decisionId: optionalStringValue(row.decisionId, row.decision_id),
  };
}

function mapConflicts(raw: unknown): ScheduleConflict[] {
  return jsonArray(raw).map(mapConflict).filter((conflict): conflict is ScheduleConflict => conflict !== null);
}

function rowSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  return objectValue(row.snapshot ?? row.payload ?? row.snapshot_json);
}

function slotValue(row: Record<string, unknown>, snapshot: Record<string, unknown>, key: StudentScheduleSnapshotSlotKey) {
  const dbKey = STUDENT_SCHEDULE_SLOT_DB_KEYS[key];
  return snapshot[key] ?? snapshot[dbKey] ?? row[key] ?? row[dbKey];
}

export function mapStudentScheduleSnapshotRow(row: Record<string, unknown>): StudentScheduleSnapshotResponseRow | null {
  const snapshot = rowSnapshot(row);
  const studentId = stringValue(row.student_id, snapshot.studentId, snapshot.student_id, snapshot.id);
  if (!studentId) return null;
  const mapped = {
    snapshotId: stringValue(row.id, row.snapshot_id, snapshot.snapshotId, snapshot.snapshot_id),
    studentId,
    semesterId: optionalStringValue(row.semester_id, snapshot.semesterId, snapshot.semester_id),
    recordedAt: stringValue(row.created_at, row.recorded_at, snapshot.recordedAt, snapshot.recorded_at),
    recordedByProfileId: optionalStringValue(row.actor_profile_id, row.recorded_by_profile_id, snapshot.recordedByProfileId, snapshot.recorded_by_profile_id),
    reason: optionalStringValue(row.reason, snapshot.reason),
    scheduleState: normalizeScheduleState(row.schedule_state ?? snapshot.scheduleState ?? snapshot.schedule_state),
    finalizedAt: optionalStringValue(row.finalized_at, snapshot.finalizedAt, snapshot.finalized_at),
    incompleteBlocks: numberValue(row.incomplete_blocks, snapshot.incompleteBlocks, snapshot.incomplete_blocks),
    hasConflicts: booleanValue(row.has_conflicts, snapshot.hasConflicts, snapshot.has_conflicts),
    conflicts: mapConflicts(row.conflicts ?? snapshot.conflicts),
  } as StudentScheduleSnapshotResponseRow;
  for (const key of STUDENT_SCHEDULE_SLOT_KEYS) {
    mapped[key] = mapBadges(slotValue(row, snapshot, key));
  }
  return mapped;
}

function classSnapshotFromSchoolClassRow(
  row: SchoolClassRow,
  options?: RecordSnapshotOptions,
): ClassSnapshotResponseRow {
  return {
    snapshotId: "",
    id: row.id,
    classId: row.id,
    semesterId: row.semesterId || undefined,
    semesterName: row.semesterName || undefined,
    recordedAt: "",
    recordedByProfileId: optionalStringValue(options?.recordedByProfileId),
    reason: optionalStringValue(options?.reason),
    name: row.name,
    program: row.program,
    teacherId: row.teacherId,
    teacher: row.teacher,
    block: row.block,
    level: row.level,
    schedule: row.schedule,
    scheduleDays: [...row.scheduleDays],
    room: row.room,
    location: row.location,
    status: row.status,
    isActive: row.isActive,
    archivedAt: row.archivedAt,
    minAgeYears: row.minAgeYears,
    maxAgeYears: row.maxAgeYears,
    capacity: row.capacity,
  };
}

function classSnapshotFromRecord(
  input: SchoolClassRow | Record<string, unknown>,
  options?: RecordSnapshotOptions,
): ClassSnapshotResponseRow | null {
  const classRow = "semesterId" in input && "scheduleDays" in input
    ? input as SchoolClassRow
    : mapClassRow(input as Record<string, unknown>);
  if (classRow) return classSnapshotFromSchoolClassRow(classRow, options);

  const row = input as Record<string, unknown>;
  const id = stringValue(row.id, row.class_id);
  if (!id) return null;
  return {
    snapshotId: "",
    id,
    classId: id,
    semesterId: optionalStringValue(row.semesterId, row.semester_id),
    semesterName: optionalStringValue(row.semesterName, row.semester_name),
    recordedAt: "",
    recordedByProfileId: optionalStringValue(options?.recordedByProfileId),
    reason: optionalStringValue(options?.reason),
    name: stringValue(row.name, row.title),
    program: normalizeProgram(row.program ?? row.track),
    teacherId: optionalStringValue(row.teacherId, row.teacher_id),
    teacher: stringValue(row.teacher, row.teacher_name),
    block: stringValue(row.block, row.block_label),
    level: stringValue(row.level, row.level_label),
    schedule: stringValue(row.schedule, row.schedule_label, row.schedule_summary),
    scheduleDays: jsonArray(row.scheduleDays ?? row.schedule_days).map((value) => String(value ?? "").trim()).filter(Boolean),
    room: optionalStringValue(row.room, row.location),
    location: optionalStringValue(row.location, row.room),
    status: optionalStringValue(row.status),
    isActive: row.isActive == null && row.is_active == null ? true : booleanValue(row.isActive, row.is_active),
    archivedAt: optionalStringValue(row.archivedAt, row.archived_at),
    minAgeYears: numberValue(row.minAgeYears, row.min_age_years),
    maxAgeYears: numberValue(row.maxAgeYears, row.max_age_years),
    capacity: numberValue(row.capacity, row.max_students),
  };
}

export function mapClassSnapshotRow(row: Record<string, unknown>): ClassSnapshotResponseRow | null {
  const snapshot = rowSnapshot(row);
  const classId = stringValue(row.class_id, snapshot.classId, snapshot.class_id, snapshot.id, row.id);
  if (!classId) return null;
  return {
    snapshotId: stringValue(row.id, row.snapshot_id, snapshot.snapshotId, snapshot.snapshot_id),
    id: stringValue(snapshot.id, row.class_id, snapshot.classId, snapshot.class_id),
    classId,
    semesterId: optionalStringValue(row.semester_id, snapshot.semesterId, snapshot.semester_id),
    semesterName: optionalStringValue(row.semester_name, snapshot.semesterName, snapshot.semester_name),
    recordedAt: stringValue(row.created_at, row.recorded_at, snapshot.recordedAt, snapshot.recorded_at),
    recordedByProfileId: optionalStringValue(row.actor_profile_id, row.recorded_by_profile_id, snapshot.recordedByProfileId, snapshot.recorded_by_profile_id),
    reason: optionalStringValue(row.reason, snapshot.reason),
    name: stringValue(row.name, snapshot.name),
    program: normalizeProgram(row.program ?? snapshot.program),
    teacherId: optionalStringValue(row.teacher_id, snapshot.teacherId, snapshot.teacher_id),
    teacher: stringValue(row.teacher, row.teacher_name, snapshot.teacher, snapshot.teacher_name),
    block: stringValue(row.block, snapshot.block),
    level: stringValue(row.level, snapshot.level),
    schedule: stringValue(row.schedule, row.schedule_summary, snapshot.schedule, snapshot.schedule_summary),
    scheduleDays: jsonArray(row.schedule_days ?? snapshot.scheduleDays ?? snapshot.schedule_days).map((value) => String(value ?? "").trim()).filter(Boolean),
    room: optionalStringValue(row.room, snapshot.room),
    location: optionalStringValue(row.location, snapshot.location),
    status: optionalStringValue(row.status, snapshot.status),
    isActive: row.is_active == null && snapshot.isActive == null && snapshot.is_active == null
      ? true
      : booleanValue(row.is_active, snapshot.isActive, snapshot.is_active),
    archivedAt: optionalStringValue(row.archived_at, snapshot.archivedAt, snapshot.archived_at),
    minAgeYears: numberValue(row.min_age_years, snapshot.minAgeYears, snapshot.min_age_years),
    maxAgeYears: numberValue(row.max_age_years, snapshot.maxAgeYears, snapshot.max_age_years),
    capacity: numberValue(row.capacity, snapshot.capacity),
  };
}

function studentSnapshotPayload(
  row: StudentScheduleRow,
  options?: RecordSnapshotOptions,
): Omit<StudentScheduleSnapshotResponseRow, "snapshotId" | "recordedAt"> {
  const payload = {
    studentId: row.id,
    semesterId: optionalStringValue(options?.semesterId),
    recordedByProfileId: optionalStringValue(options?.recordedByProfileId),
    reason: optionalStringValue(options?.reason),
    scheduleState: row.scheduleState,
    finalizedAt: row.finalizedAt,
    incompleteBlocks: row.incompleteBlocks,
    hasConflicts: Boolean(row.hasConflicts),
    conflicts: row.conflicts ?? [],
  } as Omit<StudentScheduleSnapshotResponseRow, "snapshotId" | "recordedAt">;
  for (const key of STUDENT_SCHEDULE_SLOT_KEYS) {
    payload[key] = row[key] ?? [];
  }
  return payload;
}

function studentSnapshotInsert(
  row: StudentScheduleRow,
  options?: RecordSnapshotOptions,
): Record<string, unknown> {
  const snapshot = studentSnapshotPayload(row, options);
  return {
    student_id: row.id,
    semester_id: nullableStringValue(options?.semesterId),
    source_action: stringOrDefault(options?.sourceAction, "student_schedule_snapshot.record"),
    source_entity_type: stringOrDefault(options?.sourceEntityType, "student_schedule"),
    source_entity_id: stringOrDefault(options?.sourceEntityId, row.id),
    actor_profile_id: nullableStringValue(options?.recordedByProfileId),
    snapshot,
  };
}

function classSnapshotInsert(
  input: SchoolClassRow | Record<string, unknown>,
  options?: RecordSnapshotOptions,
): Record<string, unknown> | null {
  const snapshot = classSnapshotFromRecord(input, options);
  if (!snapshot) return null;
  return {
    class_id: snapshot.classId,
    source_action: stringOrDefault(options?.sourceAction, "class_snapshot.record"),
    source_entity_id: stringOrDefault(options?.sourceEntityId, snapshot.classId),
    actor_profile_id: nullableStringValue(options?.recordedByProfileId),
    snapshot,
  };
}

export async function recordStudentScheduleSnapshot(
  row: StudentScheduleRow,
  client?: HistoryClient,
  options?: RecordSnapshotOptions,
): Promise<SnapshotWriteResult<StudentScheduleSnapshotResponseRow>> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable.", source: "unavailable" };
  if (!row.id) return { ok: false, message: "Student id is required.", source: "unavailable" };

  try {
    const supabase = client ?? await createSupabaseServerClient();
    const { data, error } = await supabase
      .from(STUDENT_SCHEDULE_SNAPSHOTS_TABLE)
      .insert(studentSnapshotInsert(row, options))
      .select("*")
      .maybeSingle();
    if (error) return { ok: false, message: error.message, source: "unavailable" };
    return {
      ok: true,
      snapshot: data ? mapStudentScheduleSnapshotRow(data as Record<string, unknown>) : null,
      source: "remote",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      source: "unavailable",
    };
  }
}

export async function recordClassSnapshot(
  row: SchoolClassRow | Record<string, unknown>,
  client?: HistoryClient,
  options?: RecordSnapshotOptions,
): Promise<SnapshotWriteResult<ClassSnapshotResponseRow>> {
  if (!isSupabaseConfigured()) return { ok: false, message: "School records are temporarily unavailable.", source: "unavailable" };
  const insert = classSnapshotInsert(row, options);
  if (!insert) return { ok: false, message: "Class id is required.", source: "unavailable" };

  try {
    const supabase = client ?? await createSupabaseServerClient();
    const { data, error } = await supabase
      .from(CLASS_SNAPSHOTS_TABLE)
      .insert(insert)
      .select("*")
      .maybeSingle();
    if (error) return { ok: false, message: error.message, source: "unavailable" };
    return {
      ok: true,
      snapshot: data ? mapClassSnapshotRow(data as Record<string, unknown>) : null,
      source: "remote",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      source: "unavailable",
    };
  }
}

export async function fetchStudentScheduleHistoryResolved(
  studentId: string,
  client: HistoryClient,
  options?: HistoryQueryOptions,
): Promise<StudentScheduleHistoryResolved> {
  const id = studentId.trim();
  if (!id) return unavailableStudentHistory();
  if (!isSupabaseConfigured()) return unavailableStudentHistory();

  try {
    let query = client
      .from(STUDENT_SCHEDULE_SNAPSHOTS_TABLE)
      .select("*")
      .eq("student_id", id)
      .order("created_at", { ascending: false })
      .limit(normalizeLimit(options?.limit));
    const semesterId = options?.semesterId?.trim();
    if (semesterId) query = query.eq("semester_id", semesterId);
    const { data, error } = await query;
    if (error) return unavailableStudentHistory();
    return {
      snapshots: ((data ?? []) as unknown as Record<string, unknown>[])
        .map(mapStudentScheduleSnapshotRow)
        .filter((snapshot): snapshot is StudentScheduleSnapshotResponseRow => snapshot !== null),
      source: "remote",
    };
  } catch {
    return unavailableStudentHistory();
  }
}

export async function fetchAdminStudentScheduleHistoryResolved(
  studentId: string,
  options?: HistoryQueryOptions,
): Promise<StudentScheduleHistoryResolved> {
  const access = await requireAdminReadClient();
  if (!access) return unavailableStudentHistory();
  return fetchStudentScheduleHistoryResolved(studentId, access.client, options);
}

export async function fetchClassSnapshotHistoryResolved(
  classId: string,
  client: HistoryClient,
  options?: HistoryQueryOptions,
): Promise<ClassSnapshotHistoryResolved> {
  const id = classId.trim();
  if (!id) return unavailableClassHistory();
  if (!isSupabaseConfigured()) return unavailableClassHistory();

  try {
    const { data, error } = await client
      .from(CLASS_SNAPSHOTS_TABLE)
      .select("*")
      .eq("class_id", id)
      .order("created_at", { ascending: false })
      .limit(normalizeLimit(options?.limit));
    if (error) return unavailableClassHistory();
    return {
      snapshots: ((data ?? []) as unknown as Record<string, unknown>[])
        .map(mapClassSnapshotRow)
        .filter((snapshot): snapshot is ClassSnapshotResponseRow => snapshot !== null),
      source: "remote",
    };
  } catch {
    return unavailableClassHistory();
  }
}

export async function fetchAdminClassSnapshotHistoryResolved(
  classId: string,
  options?: HistoryQueryOptions,
): Promise<ClassSnapshotHistoryResolved> {
  const access = await requireAdminReadClient();
  if (!access) return unavailableClassHistory();
  return fetchClassSnapshotHistoryResolved(classId, access.client, options);
}
