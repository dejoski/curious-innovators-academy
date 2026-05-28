import type { DataSource, ResolvedList } from "@/lib/data/fetch-source";
import type { ProgramTrack, StudentListItem } from "@/lib/data/types";
import { requireAdminReadClient, type AdminReadClient } from "@/lib/api/admin-read";
import { isSupabaseConfigured, unavailableList } from "@/lib/data/env";
import { firstRel } from "@/lib/data/repositories/relations";
import {
  CATALOG_SLOT_IDS,
  PARENT_SCHEDULE_SLOT_KEYS,
  catalogSlotIdFromScheduleSlot,
  scheduleSlotForClassFields,
  type ParentScheduleSlotKey,
} from "@/lib/schedule-slots";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type StudentReadClient = Awaited<ReturnType<typeof createSupabaseServerClient>> | AdminReadClient;

const CORE_REQUIRED_COUNT = PARENT_SCHEDULE_SLOT_KEYS.filter((slot) => catalogSlotIdFromScheduleSlot(slot) === null).length;
const ENRICHMENT_REQUIRED_COUNT = CATALOG_SLOT_IDS.length;

export const STUDENT_SELECT = `
  id,
  display_name,
  guardian_label,
  avatar_url,
  level,
  track,
  profile_id,
  support_notes,
  parent_students (
    parent_id,
    parents (
      id,
      profiles (
        display_name,
        email
      )
    )
  ),
  enrollments (
    id,
    status,
    classes (
      id,
      program,
      block,
      schedule_summary
    )
  ),
  class_requests (
    id,
    status,
    classes (
      id,
      program,
      block,
      schedule_summary
    )
  )
`;

const PARENT_STUDENT_SELECT = `
  id,
  display_name,
  guardian_label,
  avatar_url,
  level,
  track,
  profile_id,
  support_notes
`;

function parentContactFromStudentRow(row: Record<string, unknown>): { name: string; email: string } {
  const joins = rowsFromRelation(row.parent_students);
  const names: string[] = [];
  let email = "";
  for (const join of joins) {
    const parent = firstRel<Record<string, unknown>>(join.parents);
    const profile = firstRel<Record<string, unknown>>(parent?.profiles);
    const name = String(profile?.display_name ?? "").trim();
    if (name) names.push(name);
    if (!email) email = String(profile?.email ?? "").trim();
  }
  if (names.length > 0 || email) {
    return {
      name: names.join(", "),
      email,
    };
  }

  return {
    name: String(row.parent_name ?? row.guardian_label ?? row.parent ?? ""),
    email: String(row.parent_email ?? "").trim(),
  };
}

function parentIdsFromStudentRow(row: Record<string, unknown>): string[] {
  return rowsFromRelation(row.parent_students)
    .map((join) => String(join.parent_id ?? "").trim())
    .filter(Boolean);
}

function normalizeProgram(raw: unknown): ProgramTrack {
  const s = String(raw ?? "core").toLowerCase();
  return s === "enrichment" ? "enrichment" : "core";
}

function rowsFromRelation(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

function slotForPlacement(row: Record<string, unknown>, index: number): ParentScheduleSlotKey {
  const cls = firstRel<Record<string, unknown>>(row.classes);
  return scheduleSlotForClassFields({
    block: cls?.block,
    scheduleSummary: cls?.schedule_summary,
    fallbackIndex: index,
  });
}

function scheduleCountsFromStudentRow(row: Record<string, unknown>): Pick<
  StudentListItem,
  | "coreAssignedCount"
  | "coreRequiredCount"
  | "enrichmentApprovedCount"
  | "enrichmentRequiredCount"
  | "enrichmentPendingCount"
  | "openScheduleBlocks"
> {
  const coreSlots = new Set<ParentScheduleSlotKey>();
  const approvedEnrichmentSlots = new Set<ParentScheduleSlotKey>();
  const pendingEnrichmentSlots = new Set<ParentScheduleSlotKey>();

  rowsFromRelation(row.enrollments).forEach((enrollment, index) => {
    const status = String(enrollment.status ?? "").toLowerCase();
    if (status === "rejected") return;
    const cls = firstRel<Record<string, unknown>>(enrollment.classes);
    const program = normalizeProgram(cls?.program);
    const slot = slotForPlacement(enrollment, index);
    if (program === "core") {
      coreSlots.add(slot);
    } else if (status === "approved") {
      approvedEnrichmentSlots.add(slot);
    }
  });

  rowsFromRelation(row.class_requests).forEach((request, index) => {
    const status = String(request.status ?? "").toLowerCase();
    if (status !== "pending") return;
    const cls = firstRel<Record<string, unknown>>(request.classes);
    if (normalizeProgram(cls?.program) !== "enrichment") return;
    pendingEnrichmentSlots.add(slotForPlacement(request, index));
  });

  const coreAssignedCount = Math.min(coreSlots.size, CORE_REQUIRED_COUNT);
  const enrichmentApprovedCount = Math.min(approvedEnrichmentSlots.size, ENRICHMENT_REQUIRED_COUNT);
  const openScheduleBlocks = Math.max(
    0,
    CORE_REQUIRED_COUNT + ENRICHMENT_REQUIRED_COUNT - coreAssignedCount - enrichmentApprovedCount,
  );

  return {
    coreAssignedCount,
    coreRequiredCount: CORE_REQUIRED_COUNT,
    enrichmentApprovedCount,
    enrichmentRequiredCount: ENRICHMENT_REQUIRED_COUNT,
    enrichmentPendingCount: pendingEnrichmentSlots.size,
    openScheduleBlocks,
  };
}

export function mapStudentRow(row: Record<string, unknown>): StudentListItem | null {
  if (row.id == null || String(row.id) === "") return null;

  const id = String(row.id);
  const trackRaw = String(row.track ?? row.program_track ?? "core").toLowerCase();
  const track: ProgramTrack = trackRaw === "enrichment" ? "enrichment" : "core";

  const scheduleCounts = scheduleCountsFromStudentRow(row);
  const status: StudentListItem["status"] =
    scheduleCounts.openScheduleBlocks === 0 && scheduleCounts.enrichmentPendingCount === 0
      ? "Completed"
      : "Incomplete";
  const studentsLabel = `${scheduleCounts.enrichmentApprovedCount}/${scheduleCounts.enrichmentRequiredCount}`;

  const parentContact = parentContactFromStudentRow(row);

  return {
    id,
    name: String(row.full_name ?? row.display_name ?? row.name ?? ""),
    avatar: String(row.avatar_url ?? row.avatar ?? ""),
    parent: parentContact.name,
    parentEmail: parentContact.email || undefined,
    parentIds: parentIdsFromStudentRow(row),
    level: String(row.grade_level ?? row.level ?? ""),
    status,
    enrichment: studentsLabel,
    ...scheduleCounts,
    notes: String(row.notes ?? row.support_notes ?? ""),
    track,
  };
}

async function loadStudentsResolved(client?: StudentReadClient): Promise<ResolvedList<StudentListItem>> {
  if (!isSupabaseConfigured()) {
    return unavailableList();
  }

  try {
    const supabase = client ?? await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("students")
      .select(STUDENT_SELECT)
      .order("display_name", { ascending: true });

    if (error) {
      return unavailableList();
    }

    if (!data?.length) {
      return { items: [], source: "remote" };
    }

    const mapped = data
      .map((row) => mapStudentRow(row as Record<string, unknown>))
      .filter((x): x is StudentListItem => x !== null);

    if (mapped.length === 0) {
      return unavailableList();
    }
    return { items: mapped, source: "remote" };
  } catch {
    return unavailableList();
  }
}

/** Loads students using the current session/RLS scope. */
export async function fetchStudents(): Promise<StudentListItem[]> {
  const { items } = await loadStudentsResolved();
  return items;
}

export async function fetchStudentsResolved(): Promise<ResolvedList<StudentListItem>> {
  return loadStudentsResolved();
}

export async function fetchParentStudentsResolved(
  client: StudentReadClient,
  profileId: string,
): Promise<ResolvedList<StudentListItem>> {
  if (!isSupabaseConfigured()) {
    return unavailableList();
  }

  const userId = profileId.trim();
  if (!userId) return unavailableList();

  try {
    const { data: parent, error: parentError } = await client
      .from("parents")
      .select("id")
      .eq("profile_id", userId)
      .limit(1)
      .maybeSingle();

    if (parentError) return unavailableList();
    const parentId = String(parent?.id ?? "").trim();
    if (!parentId) return { items: [], source: "remote" };

    const { data: links, error: linksError } = await client
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", parentId);

    if (linksError) return unavailableList();
    const studentIds = Array.from(
      new Set(
        ((links ?? []) as { student_id?: unknown }[])
          .map((row) => String(row.student_id ?? "").trim())
          .filter(Boolean),
      ),
    );

    if (studentIds.length === 0) return { items: [], source: "remote" };

    const { data, error } = await client
      .from("students")
      .select(PARENT_STUDENT_SELECT)
      .in("id", studentIds)
      .order("display_name", { ascending: true });

    if (error) return unavailableList();

    const mapped = ((data ?? []) as unknown as Record<string, unknown>[])
      .map((row) => mapStudentRow(row))
      .filter((row): row is StudentListItem => row !== null);

    return { items: mapped, source: "remote" };
  } catch {
    return unavailableList();
  }
}

export async function fetchAdminStudentsResolved(): Promise<ResolvedList<StudentListItem>> {
  const access = await requireAdminReadClient();
  if (!access) return unavailableList();
  return loadStudentsResolved(access.client);
}

/** Single student for profile route — Supabase row when configured, else seed row if id matches. */
export async function fetchStudentByIdResolved(
  id: string,
  client?: StudentReadClient,
): Promise<{ student: StudentListItem | null; source: DataSource }> {
  const normalized = String(id).trim();
  if (!normalized) {
    return { student: null, source: "unavailable" };
  }

  if (!isSupabaseConfigured()) {
    return { student: null, source: "unavailable" };
  }

  try {
    const supabase = client ?? await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("students")
      .select(STUDENT_SELECT)
      .eq("id", normalized)
      .maybeSingle();

    if (error) {
      return { student: null, source: "unavailable" };
    }
    if (!data) {
      return { student: null, source: "remote" };
    }
    const mapped = mapStudentRow(data as Record<string, unknown>);
    if (!mapped) {
      return { student: null, source: "remote" };
    }
    return { student: mapped, source: "remote" };
  } catch {
    return { student: null, source: "unavailable" };
  }
}

export async function fetchAdminStudentByIdResolved(
  id: string,
): Promise<{ student: StudentListItem | null; source: DataSource }> {
  const access = await requireAdminReadClient();
  if (!access) return { student: null, source: "unavailable" };
  return fetchStudentByIdResolved(id, access.client);
}
