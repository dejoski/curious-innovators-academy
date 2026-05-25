import "server-only";

import type { ResolvedList } from "@/lib/data/fetch-source";
import type { StudentListItem } from "@/lib/data/types";
import { isSupabaseConfigured, unavailableList } from "@/lib/data/env";
import { isSupabaseAdminConfigured } from "@/lib/data/server-env";
import { firstRel } from "@/lib/data/repositories/relations";
import {
  mapStudentRow,
  STUDENT_SELECT,
} from "@/lib/data/repositories/students";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type DemoParentContext = {
  parentId: string;
  displayName: string;
  email: string;
  studentIds: string[];
  defaultStudentId: string | null;
};

function relationRows(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
  if (raw && typeof raw === "object") return [raw as Record<string, unknown>];
  return [];
}

function parentStudentIds(parent: Record<string, unknown>): string[] {
  return relationRows(parent.parent_students)
    .map((row) => String(row.student_id ?? "").trim())
    .filter(Boolean);
}

function parentLabel(parent: Record<string, unknown>): { displayName: string; email: string } {
  const profile = firstRel<Record<string, unknown>>(parent.profiles);
  return {
    displayName: String(profile?.display_name ?? parent.display_name ?? "Demo parent").trim() || "Demo parent",
    email: String(profile?.email ?? "").trim(),
  };
}

async function resolveDemoParentContext(): Promise<DemoParentContext | null> {
  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) return null;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("parents")
    .select("id, profiles ( display_name, email ), parent_students ( student_id )");

  if (error || !data?.length) return null;

  const parent = (data as unknown as Record<string, unknown>[])
    .map((row) => ({ row, studentIds: parentStudentIds(row) }))
    .sort((a, b) => b.studentIds.length - a.studentIds.length)[0];
  if (!parent?.row?.id) return null;

  const { displayName, email } = parentLabel(parent.row);
  return {
    parentId: String(parent.row.id),
    displayName,
    email,
    studentIds: parent.studentIds,
    defaultStudentId: parent.studentIds[0] ?? null,
  };
}

async function loadStudentsByIds(ids: string[]): Promise<ResolvedList<StudentListItem>> {
  if (!ids.length || !isSupabaseConfigured() || !isSupabaseAdminConfigured()) {
    return { items: [], source: "remote" };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("students")
    .select(STUDENT_SELECT)
    .in("id", ids)
    .order("display_name", { ascending: true });

  if (error) return unavailableList();

  const mapped = ((data ?? []) as unknown as Record<string, unknown>[])
    .map(mapStudentRow)
    .filter((row): row is StudentListItem => row !== null);

  return { items: mapped, source: "remote" };
}

export async function fetchDemoAllStudentsResolved(): Promise<ResolvedList<StudentListItem>> {
  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) return unavailableList();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("students")
    .select(STUDENT_SELECT)
    .order("display_name", { ascending: true });

  if (error) return unavailableList();

  const mapped = ((data ?? []) as unknown as Record<string, unknown>[])
    .map(mapStudentRow)
    .filter((row): row is StudentListItem => row !== null);

  return { items: mapped, source: "remote" };
}

export async function fetchDemoParentProfile(): Promise<{
  displayName: string;
  email: string;
  defaultStudentId: string | null;
}> {
  const parent = await resolveDemoParentContext();
  return {
    displayName: parent?.displayName ?? "Demo parent",
    email: parent?.email ?? "",
    defaultStudentId: parent?.defaultStudentId ?? null,
  };
}

export async function fetchDemoParentStudentsResolved(): Promise<ResolvedList<StudentListItem>> {
  const parent = await resolveDemoParentContext();
  if (!parent) return unavailableList();
  return loadStudentsByIds(parent.studentIds);
}

export async function demoParentCanAccessStudent(studentId: string): Promise<boolean> {
  const id = studentId.trim();
  if (!id) return false;
  const parent = await resolveDemoParentContext();
  return Boolean(parent?.studentIds.includes(id));
}
