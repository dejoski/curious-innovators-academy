import { firstRel } from "@/lib/data/repositories/relations";

export const STUDENT_PARENT_CONTACT_SELECT = `
  parent_students (
    parent_id,
    parents (
      id,
      profiles (
        display_name,
        email
      )
    )
  )
`;

export type StudentParentContact = {
  name: string;
  email: string;
  names: string[];
  emails: string[];
  parentIds: string[];
  hasLinkedParents: boolean;
};

function rowsFromRelation(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

function cleanUnique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function parentContactFromStudentRow(
  row: Record<string, unknown> | null | undefined,
  fallback: { name?: unknown; email?: unknown } = {},
): StudentParentContact {
  const names: string[] = [];
  const emails: string[] = [];
  const parentIds: string[] = [];

  for (const join of rowsFromRelation(row?.parent_students)) {
    const joinParentId = String(join.parent_id ?? "").trim();
    const parent = firstRel<Record<string, unknown>>(join.parents);
    const parentId = String(parent?.id ?? joinParentId).trim();
    const profile = firstRel<Record<string, unknown>>(parent?.profiles);
    if (parentId) parentIds.push(parentId);
    const name = String(profile?.display_name ?? "").trim();
    const email = String(profile?.email ?? "").trim();
    if (name) names.push(name);
    if (email) emails.push(email);
  }

  const uniqueNames = cleanUnique(names);
  const uniqueEmails = cleanUnique(emails);
  const uniqueParentIds = cleanUnique(parentIds);
  const fallbackName = String(fallback.name ?? row?.guardian_label ?? row?.parent_name ?? row?.parent ?? "").trim();
  const fallbackEmail = String(fallback.email ?? row?.parent_email ?? "").trim();

  return {
    name: uniqueNames.length ? uniqueNames.join(", ") : fallbackName,
    email: uniqueEmails[0] ?? fallbackEmail,
    names: uniqueNames,
    emails: uniqueEmails,
    parentIds: uniqueParentIds,
    hasLinkedParents: uniqueParentIds.length > 0,
  };
}
