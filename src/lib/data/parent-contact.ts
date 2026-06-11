import { firstRel } from "@/lib/data/repositories/relations";

export const STUDENT_PARENT_CONTACT_SELECT = `
  parent_students (
    parent_id,
    parents (
      id,
      phone,
      profiles (
        display_name,
        email
      )
    )
  )
`;

export type StudentParentContactEntry = {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
};

export type StudentParentContact = {
  name: string;
  email: string;
  names: string[];
  emails: string[];
  phones: string[];
  parentIds: string[];
  contacts: StudentParentContactEntry[];
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
  const contacts: StudentParentContactEntry[] = [];
  const names: string[] = [];
  const emails: string[] = [];
  const phones: string[] = [];
  const parentIds: string[] = [];

  for (const join of rowsFromRelation(row?.parent_students)) {
    const joinParentId = String(join.parent_id ?? "").trim();
    const parent = firstRel<Record<string, unknown>>(join.parents);
    const parentId = String(parent?.id ?? joinParentId).trim();
    const profile = firstRel<Record<string, unknown>>(parent?.profiles);
    const name = String(profile?.display_name ?? "").trim();
    const email = String(profile?.email ?? "").trim();
    const phone = String(parent?.phone ?? "").trim();
    if (!parentId && !name && !email && !phone) continue;
    contacts.push({
      id: parentId || undefined,
      name: name || "Parent contact",
      email: email || undefined,
      phone: phone || undefined,
    });
  }

  const uniqueContacts = Array.from(
    new Map(
      contacts.map((contact) => [
        contact.id ?? `${contact.name}|${contact.email ?? ""}|${contact.phone ?? ""}`,
        contact,
      ]),
    ).values(),
  );
  for (const contact of uniqueContacts) {
    if (contact.id) parentIds.push(contact.id);
    if (contact.name) names.push(contact.name);
    if (contact.email) emails.push(contact.email);
    if (contact.phone) phones.push(contact.phone);
  }

  const uniqueNames = cleanUnique(names);
  const uniqueEmails = cleanUnique(emails);
  const uniquePhones = cleanUnique(phones);
  const uniqueParentIds = cleanUnique(parentIds);
  const fallbackName = String(fallback.name ?? row?.guardian_label ?? row?.parent_name ?? row?.parent ?? "").trim();
  const fallbackEmail = String(fallback.email ?? row?.parent_email ?? "").trim();

  return {
    name: uniqueNames.length ? uniqueNames.join(", ") : fallbackName,
    email: uniqueEmails[0] ?? fallbackEmail,
    names: uniqueNames,
    emails: uniqueEmails,
    phones: uniquePhones,
    parentIds: uniqueParentIds,
    contacts: uniqueContacts,
    hasLinkedParents: uniqueParentIds.length > 0,
  };
}
