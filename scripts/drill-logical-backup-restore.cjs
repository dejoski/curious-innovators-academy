#!/usr/bin/env node
/*
 * Logical backup/restore drill for the Supabase application data contract.
 *
 * This is an operator safety net for application data while managed Supabase backups
 * are unavailable. It does not replace a real Supabase PITR/daily-backup
 * restore into a separate project before storing production student data.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  assert,
  env,
  loadDotenvFiles,
  projectRefFromUrl,
} = require("./lib/env.cjs");
const {
  runManagementQuery: runQuery,
} = require("./lib/supabase-management.cjs");

const REQUIRED_TABLES = [
  ["profiles", 6],
  ["parents", 3],
  ["teachers", 1],
  ["students", 6],
  ["parent_students", 6],
  ["classes", 5],
  ["enrollments", 5],
  ["class_requests", 6],
  ["schedule_events", 1],
  ["student_records", 1],
  ["feedback", 1],
  ["notifications", 1],
  ["invoices", 3],
  ["user_preferences", 0],
  ["support_tickets", 0],
  ["audit_events", 0],
];

const PROFILE_CONTRACT_SPECS = [
  ["CIA_RLS_ADMIN_EMAIL", "admin"],
  ["CIA_RLS_PARENT_EMAIL", "parent"],
  ["CIA_RLS_TEACHER_EMAIL", "teacher"],
  ["CIA_RLS_STUDENT_EMAIL", "student"],
];

function quoteIdent(name) {
  assert(/^[a-z_][a-z0-9_]*$/.test(name), `unsafe identifier: ${name}`);
  return `"${name.replaceAll('"', '""')}"`;
}

function normalizeJsonRows(value, tableName) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fall through to the consistent error below.
    }
  }
  throw new Error(`${tableName}: expected JSON array from Management API`);
}

async function exportTable(token, ref, tableName) {
  const ident = quoteIdent(tableName);
  const rows = await runQuery(
    token,
    ref,
    `
      select coalesce(jsonb_agg(to_jsonb(row_data)), '[]'::jsonb) as rows
      from (
        select *
        from public.${ident}
      ) as row_data;
    `,
  );
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(`${tableName}: expected a single aggregate row`);
  }
  return normalizeJsonRows(rows[0].rows, tableName);
}

async function exportTableWithServiceRole(admin, tableName) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await admin.from(tableName).select("*").range(from, to);
    if (error) throw new Error(`${tableName}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function idSet(rows, label, key = "id") {
  const values = new Set();
  for (const row of rows) {
    const value = row?.[key];
    if (typeof value === "string" && value) values.add(value);
  }
  if (values.size !== rows.length) {
    throw new Error(`${label}: ${rows.length - values.size} row(s) are missing ${key}`);
  }
  return values;
}

function optionalIdSet(rows, key) {
  const values = new Set();
  for (const row of rows) {
    const value = row?.[key];
    if (typeof value === "string" && value) values.add(value);
  }
  return values;
}

function requireRefs(snapshot, tableName, fieldName, targetIds, { nullable = false } = {}) {
  const missing = [];
  for (const row of snapshot[tableName] || []) {
    const value = row?.[fieldName];
    if (value === null || value === undefined || value === "") {
      if (!nullable) missing.push("(blank)");
    } else if (!targetIds.has(value)) {
      missing.push(value);
    }
  }
  if (missing.length) {
    const unique = Array.from(new Set(missing)).slice(0, 8).join(", ");
    throw new Error(`${tableName}.${fieldName}: ${missing.length} invalid reference(s): ${unique}`);
  }
}

function requireValues(rows, fieldName, expectedValues, label) {
  const actual = new Set(rows.map((row) => String(row?.[fieldName] ?? "").toLowerCase()));
  const missing = expectedValues.filter((value) => !actual.has(String(value).toLowerCase()));
  if (missing.length) throw new Error(`${label}: missing ${missing.join(", ")}`);
}

function csvEnv(name) {
  return env(name)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function profileContractFromEnv() {
  return PROFILE_CONTRACT_SPECS
    .map(([emailEnv, role]) => [env(emailEnv).toLowerCase(), role])
    .filter(([email]) => Boolean(email));
}

function validateSnapshot(snapshot) {
  const tableCounts = [];
  for (const [tableName, minRows] of REQUIRED_TABLES) {
    const rows = snapshot[tableName];
    assert(Array.isArray(rows), `${tableName}: missing from snapshot`);
    if (rows.length < minRows) {
      throw new Error(`${tableName}: ${rows.length}/${minRows} required rows restored`);
    }
    tableCounts.push(`${tableName}=${rows.length}`);
  }

  const profilesByEmail = new Map(
    snapshot.profiles.map((profile) => [String(profile.email || "").toLowerCase(), profile]),
  );
  const requiredProfiles = profileContractFromEnv();
  const profileMismatches = [];
  for (const [email, role] of requiredProfiles) {
    const profile = profilesByEmail.get(email);
    if (!profile) profileMismatches.push(`${email}: missing`);
    else if (profile.role !== role) profileMismatches.push(`${email}: expected ${role}, got ${profile.role}`);
  }
  if (profileMismatches.length) throw new Error(`profile contract mismatch: ${profileMismatches.join("; ")}`);

  requireValues(snapshot.students, "display_name", csvEnv("CIA_RESTORE_REQUIRED_STUDENTS"), "student restore contract");
  requireValues(snapshot.classes, "name", csvEnv("CIA_RESTORE_REQUIRED_CLASSES"), "class restore contract");
  requireValues(snapshot.invoices, "invoice_number", csvEnv("CIA_RESTORE_REQUIRED_INVOICES"), "invoice restore contract");

  const profileIds = idSet(snapshot.profiles, "profiles");
  const parentIds = idSet(snapshot.parents, "parents");
  const teacherIds = idSet(snapshot.teachers, "teachers");
  const studentIds = idSet(snapshot.students, "students");
  const classIds = idSet(snapshot.classes, "classes");

  requireRefs(snapshot, "parents", "profile_id", profileIds);
  requireRefs(snapshot, "teachers", "profile_id", profileIds);
  requireRefs(snapshot, "students", "profile_id", profileIds, { nullable: true });
  requireRefs(snapshot, "parent_students", "parent_id", parentIds);
  requireRefs(snapshot, "parent_students", "student_id", studentIds);
  requireRefs(snapshot, "classes", "teacher_id", teacherIds);
  requireRefs(snapshot, "enrollments", "class_id", classIds);
  requireRefs(snapshot, "enrollments", "student_id", studentIds);
  requireRefs(snapshot, "class_requests", "class_id", classIds);
  requireRefs(snapshot, "class_requests", "student_id", studentIds);
  requireRefs(snapshot, "class_requests", "requested_by_profile_id", profileIds);
  requireRefs(snapshot, "schedule_events", "class_id", classIds, { nullable: true });
  requireRefs(snapshot, "student_records", "student_id", studentIds);
  requireRefs(snapshot, "student_records", "author_profile_id", profileIds);
  requireRefs(snapshot, "feedback", "student_id", studentIds);
  requireRefs(snapshot, "feedback", "author_profile_id", profileIds);
  requireRefs(snapshot, "feedback", "class_id", classIds, { nullable: true });
  requireRefs(snapshot, "notifications", "recipient_profile_id", profileIds);
  requireRefs(snapshot, "invoices", "student_id", studentIds);
  requireRefs(snapshot, "user_preferences", "profile_id", profileIds);
  requireRefs(snapshot, "support_tickets", "profile_id", profileIds, { nullable: true });
  requireRefs(snapshot, "audit_events", "actor_profile_id", profileIds, { nullable: true });

  const linkedParentIds = optionalIdSet(snapshot.parent_students, "parent_id");
  const linkedStudentIds = optionalIdSet(snapshot.parent_students, "student_id");
  assert(linkedParentIds.size >= 2, `parent_students: expected at least 2 linked parents, got ${linkedParentIds.size}`);
  assert(linkedStudentIds.size >= 5, `parent_students: expected at least 5 linked students, got ${linkedStudentIds.size}`);

  return tableCounts;
}

async function main() {
  const root = path.join(__dirname, "..");
  loadDotenvFiles(root, [".env.production.local", ".env.local", ".env"]);

  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`Usage:
  SUPABASE_ACCESS_TOKEN=<management token> \\
  SUPABASE_PROJECT_REF=<project ref> \\
  npm run drill:logical-backup-restore

Alternative:
  NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co can be used instead of SUPABASE_PROJECT_REF.

Fallback:
  When SUPABASE_ACCESS_TOKEN is not set, this script uses SUPABASE_SERVICE_ROLE_KEY
  from local env files to export the same app-table snapshot.

Optional:
  CIA_KEEP_BACKUP_ARTIFACT=true leaves the temporary JSON snapshot on disk.
  CIA_RESTORE_REQUIRED_STUDENTS, CIA_RESTORE_REQUIRED_CLASSES, and
  CIA_RESTORE_REQUIRED_INVOICES add comma-separated value checks.
`);
    return;
  }

  const token = env("SUPABASE_ACCESS_TOKEN");
  const supabaseUrl = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const ref = env("SUPABASE_PROJECT_REF") || projectRefFromUrl(supabaseUrl);
  const keepArtifact = env("CIA_KEEP_BACKUP_ARTIFACT") === "true";
  assert(ref, "SUPABASE_PROJECT_REF, SUPABASE_URL, or NEXT_PUBLIC_SUPABASE_URL is required");
  if (!token) {
    assert(supabaseUrl, "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required when SUPABASE_ACCESS_TOKEN is absent");
    assert(serviceKey, "SUPABASE_SERVICE_ROLE_KEY is required when SUPABASE_ACCESS_TOKEN is absent");
    if (env("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")) {
      throw new Error("service role key must not be exposed as NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");
    }
  }
  const exportSource = token ? "Supabase Management API" : "Supabase service-role client";
  const admin = token
    ? null
    : require("@supabase/supabase-js").createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

  const startedAt = new Date().toISOString();
  const tables = REQUIRED_TABLES.map(([tableName]) => tableName);
  const snapshot = {
    metadata: {
      kind: "curious-innovators-academy-logical-backup",
      project_ref: ref,
      exported_at: startedAt,
      export_source: exportSource,
      table_count: tables.length,
    },
    tables: {},
  };

  for (const tableName of tables) {
    snapshot.tables[tableName] = token
      ? await exportTable(token, ref, tableName)
      : await exportTableWithServiceRole(admin, tableName);
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `cia-logical-backup-${ref}-`));
  const artifactPath = path.join(dir, "snapshot.json");
  fs.writeFileSync(artifactPath, JSON.stringify(snapshot), { mode: 0o600 });

  let tableCounts;
  try {
    const restored = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    assert(restored?.metadata?.kind === "curious-innovators-academy-logical-backup", "snapshot artifact kind mismatch");
    assert(restored.metadata.project_ref === ref, "snapshot artifact project ref mismatch");
    tableCounts = validateSnapshot(restored.tables || {});
  } catch (err) {
    throw new Error(`snapshot artifact could not be restored: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    if (!keepArtifact) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  console.log(`Logical backup/restore drill OK for ${ref}`);
  console.log(`- export source: ${exportSource}`);
  console.log(`- exported tables: ${tables.length}`);
  console.log(`- restore validation: row counts, demo contract, and FK-like references passed`);
  console.log(`- table counts: ${tableCounts.join(", ")}`);
  console.log(
    keepArtifact
      ? `- snapshot artifact retained at ${artifactPath}`
      : "- temporary snapshot artifact created, reloaded, validated, and removed",
  );
  console.log("- scope: logical app-table drill only; still run a managed Supabase restore before real student data");
}

main().catch((err) => {
  console.error("Logical backup/restore drill FAIL:");
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
