#!/usr/bin/env node
/*
 * Repoints parent.demo@curiousinnovators.academy to the parent profile with
 * the largest student roster, then refreshes `parent_students` links.
 *
 * This is a one-off maintenance script; it assumes service-role credentials are
 * available and never prints sensitive values.
 */

const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { loadDotenvFiles, env } = require("./lib/env.cjs");

const DEMO_PARENT_EMAIL = "parent.demo@curiousinnovators.academy";
const EXPECTED_ROLE = "parent";

const root = path.join(__dirname, "..");
loadDotenvFiles(root, [".env.production.local", ".env.local", ".env"]);

const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");

function usage() {
  console.log(`Usage:
  node scripts/sync-demo-parent-max-kids.cjs [--dry-run]

This script syncs the parent demo account's student links to the parent row with the
largest number of linked students.
`);
}

if (args.has("--help") || args.has("-h")) {
  usage();
  process.exit(0);
}

async function listAllAuthUsers(admin) {
  const users = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    users.push(...(data.users ?? []));
    if (!data.users || data.users.length < 1000) break;
    page += 1;
  }
  return users;
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function parentIdByProfileCountByParentId(parentStudentsRows) {
  const counts = new Map();
  for (const row of parentStudentsRows) {
    const parentId = String(row.parent_id ?? "").trim();
    if (!parentId) continue;
    counts.set(parentId, (counts.get(parentId) || 0) + 1);
  }
  return counts;
}

function parentWithMostStudents(counts) {
  let bestParentId = "";
  let bestCount = -1;
  for (const [parentId, count] of counts) {
    if (count > bestCount) {
      bestParentId = parentId;
      bestCount = count;
    }
  }
  return { bestParentId, bestCount };
}

async function main() {
  const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL is missing.");
  }
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
  }
  if (env("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")) {
    throw new Error("SUPABASE service role must not be exposed as NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY.");
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const users = await listAllAuthUsers(admin);
  const demoUser = users.find((u) => String(u.email ?? "").toLowerCase() === DEMO_PARENT_EMAIL);
  if (!demoUser || !demoUser.id) {
    throw new Error(`Auth user not found for ${DEMO_PARENT_EMAIL}`);
  }

  const { data: demoProfileRow, error: demoProfileError } = await admin
    .from("profiles")
    .select("id, role, email")
    .eq("id", demoUser.id)
    .maybeSingle();
  if (demoProfileError || !demoProfileRow) {
    throw new Error(`Demo profile query failed for ${DEMO_PARENT_EMAIL}: ${demoProfileError?.message ?? "not found"}`);
  }

  const { data: demoParentRows, error: demoParentError } = await admin
    .from("parents")
    .select("id")
    .eq("profile_id", demoProfileRow.id)
    .limit(1);

  if (demoParentError) throw new Error(`Failed fetching demo parent row: ${demoParentError.message}`);
  const demoParentId = demoParentRows?.[0]?.id ? String(demoParentRows[0].id) : "";

  const { data: parentRows, error: parentRowsError } = await admin.from("parents").select("id, profile_id");
  if (parentRowsError) throw new Error(`Failed fetching parents: ${parentRowsError.message}`);
  if (!parentRows?.length) {
    throw new Error("No parent rows found.");
  }

  const { data: profileRows, error: profileRowsError } = await admin
    .from("profiles")
    .select("id, email, role")
    .in("id", parentRows.map((row) => row.profile_id));
  if (profileRowsError) throw new Error(`Failed fetching parent profile rows: ${profileRowsError.message}`);

  const profileById = new Map(
    (profileRows ?? []).map((row) => [String(row.id), String(row.email ?? "").toLowerCase()]),
  );
  const { data: parentStudentRows, error: parentStudentRowsError } = await admin
    .from("parent_students")
    .select("parent_id, student_id");
  if (parentStudentRowsError) {
    throw new Error(`Failed fetching parent-student links: ${parentStudentRowsError.message}`);
  }

  const counts = parentIdByProfileCountByParentId(parentStudentRows ?? []);
  if (!counts.size) throw new Error("No parent-student links found.");

  const { bestParentId, bestCount } = parentWithMostStudents(counts);
  if (!bestParentId) {
    throw new Error("Unable to determine a max-student parent.");
  }

  const { data: bestParentLinks, error: bestParentLinksError } = await admin
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", bestParentId);
  if (bestParentLinksError) {
    throw new Error(`Failed fetching best parent links: ${bestParentLinksError.message}`);
  }

  const replacementStudents = uniqueValues((bestParentLinks ?? []).map((row) => row.student_id));

  if (isDryRun) {
    console.log("DRY RUN: no changes applied.");
    console.log(`Demo profile: ${DEMO_PARENT_EMAIL} (${demoProfileRow.id})`);
    console.log(`Demo parent row: ${demoParentId || "(missing)"}`);
    console.log(`Max students parent: ${bestParentId} (${bestCount} students)`);
    console.log(`Replacement students: ${replacementStudents.length ? replacementStudents.join(", ") : "(none)"}`);
    return;
  }

  const updates = [];

  if (String(demoProfileRow.role || "").toLowerCase() !== EXPECTED_ROLE) {
    updates.push(`Fix role for ${DEMO_PARENT_EMAIL} from ${String(demoProfileRow.role)} to ${EXPECTED_ROLE}.`);
    const roleUpdate = await admin
      .from("profiles")
      .update({ role: EXPECTED_ROLE })
      .eq("id", demoProfileRow.id);
    if (roleUpdate.error) throw new Error(`Failed role fix: ${roleUpdate.error.message}`);
  }

  let parentRowId = demoParentId;
  if (!parentRowId) {
    const { data: createdParentRow, error: parentInsertError } = await admin
      .from("parents")
      .insert({ profile_id: demoProfileRow.id })
      .select("id")
      .maybeSingle();
    if (parentInsertError || !createdParentRow?.id) {
      throw new Error(
        `Failed to create parent row for ${DEMO_PARENT_EMAIL}: ${parentInsertError?.message ?? "not returned"}`,
      );
    }
    parentRowId = String(createdParentRow.id);
  }

  const { error: removeError } = await admin
    .from("parent_students")
    .delete()
    .eq("parent_id", parentRowId);
  if (removeError) throw new Error(`Failed removing old demo links: ${removeError.message}`);

  if (replacementStudents.length) {
    const insertRows = replacementStudents.map((studentId) => ({
      parent_id: parentRowId,
      student_id: studentId,
    }));
    const { error: insertError } = await admin.from("parent_students").insert(insertRows);
    if (insertError) throw new Error(`Failed inserting replacement links: ${insertError.message}`);
  }

  const { data: finalDemoLinks, error: finalDemoLinksError } = await admin
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", parentRowId);
  if (finalDemoLinksError) {
    throw new Error(`Post-sync validation query failed: ${finalDemoLinksError.message}`);
  }

  const finalStudentCount = uniqueValues((finalDemoLinks ?? []).map((row) => row.student_id)).length;
  const bestParentProfileId = parentRows.find((row) => row.id === bestParentId)?.profile_id;
  const bestParentEmail = bestParentProfileId
    ? profileById.get(String(bestParentProfileId)) || "(unknown)"
    : "(unknown)";
  console.log("Demo parent sync completed.");
  console.log(`Demo email: ${DEMO_PARENT_EMAIL}`);
  console.log(`Max-student source parent: ${bestParentId}`);
  console.log(`Source parent profile: ${bestParentEmail}`);
  console.log(`Demo students linked: ${finalStudentCount}`);
  console.log(`Best parent student count before sync: ${bestCount}`);
  if (updates.length) {
    for (const note of updates) console.log(note);
  }
}

main()
  .catch((error) => {
    console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
