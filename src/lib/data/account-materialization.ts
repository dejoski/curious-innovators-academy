import "server-only";

import { isSupabaseAdminConfigured } from "@/lib/data/server-env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ACCOUNT_ROLES = ["admin", "parent", "teacher", "student"] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export type AccountWriteFail = { ok: false; message: string };
export type AccountWriteOk<T> = { ok: true } & T;

export type AccountMutationClient =
  | Awaited<ReturnType<typeof createSupabaseServerClient>>
  | ReturnType<typeof createSupabaseAdminClient>;

export function normalizeAccountRole(raw: unknown): AccountRole {
  const role = String(raw ?? "parent").toLowerCase();
  return ACCOUNT_ROLES.includes(role as AccountRole) ? (role as AccountRole) : "parent";
}

export function normalizeAccountDisplayName(raw: unknown): string {
  return String(raw ?? "").trim().replace(/\s+/g, " ");
}

export function cleanAccountEmail(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

export function isValidAccountEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function temporaryAccountPassword(): string {
  return `Cia-${crypto.randomUUID()}-Aa1!`;
}

export async function authUserIdForEmail(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  email: string,
): Promise<string | null> {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const found = data.users?.find((user) => cleanAccountEmail(user.email) === email);
    if (found?.id) return found.id;
    if (!data.users || data.users.length < 1000) return null;
    page += 1;
  }
}

async function readParentId(
  client: AccountMutationClient,
  profileId: string,
): Promise<AccountWriteOk<{ parentId: string }> | AccountWriteFail> {
  const { data, error } = await client
    .from("parents")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  const parentId = String(data?.id ?? "");
  if (!parentId) return { ok: false, message: "Parent account row was not created." };
  return { ok: true, parentId };
}

async function readTeacherId(
  client: AccountMutationClient,
  profileId: string,
): Promise<AccountWriteOk<{ teacherId: string }> | AccountWriteFail> {
  const { data, error } = await client
    .from("teachers")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  const teacherId = String(data?.id ?? "");
  if (!teacherId) return { ok: false, message: "Teacher account row was not created." };
  return { ok: true, teacherId };
}

export async function materializeProfileRole(
  client: AccountMutationClient,
  input: { profileId: string; role: AccountRole },
): Promise<AccountWriteOk<{ parentId?: string; teacherId?: string }> | AccountWriteFail> {
  const profileId = input.profileId.trim();
  if (!profileId) return { ok: false, message: "Missing profile id." };

  if (input.role === "parent") {
    const existing = await readParentId(client, profileId);
    if (existing.ok) return existing;

    const { error } = await client.from("parents").insert({ profile_id: profileId });
    if (error && error.code !== "23505") return { ok: false, message: error.message };
    return readParentId(client, profileId);
  }

  if (input.role === "teacher") {
    const existing = await readTeacherId(client, profileId);
    if (existing.ok) return existing;

    const { error } = await client.from("teachers").insert({ profile_id: profileId });
    if (error && error.code !== "23505") return { ok: false, message: error.message };
    return readTeacherId(client, profileId);
  }

  return { ok: true };
}

export async function ensureParentAccountForEmail(
  client: AccountMutationClient,
  input: { displayName: string; email: string },
): Promise<AccountWriteOk<{ parentId: string; profileId: string }> | AccountWriteFail> {
  const displayName = normalizeAccountDisplayName(input.displayName) || "Parent";
  const email = cleanAccountEmail(input.email);
  if (!isValidAccountEmail(email)) return { ok: false, message: "Enter a valid parent email address" };

  const { data: existingProfile, error: profileReadError } = await client
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (profileReadError) return { ok: false, message: profileReadError.message };

  let profileId = String(existingProfile?.id ?? "");
  let staleProfileId = "";
  if (!isSupabaseAdminConfigured() && !profileId) {
    return { ok: false, message: "Parent account setup is temporarily unavailable." };
  }

  if (isSupabaseAdminConfigured()) {
    const admin = createSupabaseAdminClient();
    const authProfileId = (await authUserIdForEmail(admin, email)) ?? "";
    if (authProfileId) {
      if (profileId && profileId !== authProfileId) staleProfileId = profileId;
      profileId = authProfileId;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: temporaryAccountPassword(),
        email_confirm: true,
        user_metadata: { full_name: displayName },
      });
      if (error || !data.user?.id) {
        return { ok: false, message: error?.message ?? "Could not create parent account" };
      }
      if (profileId && profileId !== data.user.id) staleProfileId = profileId;
      profileId = data.user.id;
    }
  }

  const { error: profileWriteError } = await client.from("profiles").upsert(
    {
      id: profileId,
      role: "parent",
      display_name: displayName,
      email,
    },
    { onConflict: "id" },
  );
  if (profileWriteError) return { ok: false, message: profileWriteError.message };

  if (staleProfileId) {
    const { error: parentRelinkError } = await client
      .from("parents")
      .update({ profile_id: profileId })
      .eq("profile_id", staleProfileId);
    if (parentRelinkError) return { ok: false, message: parentRelinkError.message };
  }

  const materialized = await materializeProfileRole(client, { profileId, role: "parent" });
  if (!materialized.ok) return materialized;
  if (!materialized.parentId) return { ok: false, message: "Could not create parent record" };
  return { ok: true, parentId: materialized.parentId, profileId };
}

export async function upsertAccountProfile(
  client: AccountMutationClient,
  input: { profileId: string; email: string; displayName: string; role: AccountRole },
): Promise<AccountWriteOk<{ profileId: string; parentId?: string; teacherId?: string }> | AccountWriteFail> {
  const profileId = input.profileId.trim();
  const email = cleanAccountEmail(input.email);
  const displayName = normalizeAccountDisplayName(input.displayName) || email || "Signed-in user";
  const role = normalizeAccountRole(input.role);
  if (!profileId) return { ok: false, message: "Missing profile id." };
  if (!isValidAccountEmail(email)) return { ok: false, message: "Valid email is required." };

  const { error } = await client.from("profiles").upsert(
    {
      id: profileId,
      role,
      display_name: displayName,
      email,
    },
    { onConflict: "id" },
  );
  if (error) return { ok: false, message: error.message };

  const materialized = await materializeProfileRole(client, { profileId, role });
  if (!materialized.ok) return materialized;
  return { ok: true, profileId, parentId: materialized.parentId, teacherId: materialized.teacherId };
}
