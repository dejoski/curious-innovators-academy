#!/usr/bin/env node
/*
 * Supabase backup readiness check.
 *
 * This is intentionally separate from CI because backup metadata needs either a
 * Supabase Management API token or an authenticated Supabase CLI profile. It
 * verifies that the target project has restorable backups/PITR available before
 * real student data is treated as protected by a restore path.
 */

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);
const root = path.join(__dirname, "..");

const REQUIRED_TABLES = [
  "profiles",
  "parents",
  "teachers",
  "students",
  "parent_students",
  "classes",
  "enrollments",
  "class_requests",
  "schedule_events",
  "student_records",
  "feedback",
  "notifications",
  "invoices",
  "user_preferences",
  "support_tickets",
  "audit_events",
];

function env(name) {
  const value = process.env[name]?.trim();
  return value || "";
}

function loadDotenv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function projectRefFromUrl(rawUrl) {
  if (!rawUrl) return "";
  try {
    const host = new URL(rawUrl).host;
    const [ref] = host.split(".");
    return ref || "";
  } catch {
    return "";
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function managementFetch(token, path, options = {}) {
  const response = await fetch(`https://api.supabase.com/v1${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}: ${text.slice(0, 1000)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function runQuery(token, ref, query) {
  return managementFetch(token, `/projects/${ref}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

async function supabaseCliJson(args) {
  const { stdout } = await execFileAsync("supabase", [...args, "--output", "json"], {
    cwd: root,
    maxBuffer: 1024 * 1024 * 8,
  });
  return JSON.parse(stdout);
}

async function loadMetadataFromCli(ref) {
  const [projects, backupInfo] = await Promise.all([
    supabaseCliJson(["projects", "list"]),
    supabaseCliJson(["backups", "list", "--project-ref", ref]),
  ]);
  const projectInfo = Array.isArray(projects)
    ? projects.find((project) => project?.id === ref)
    : null;
  if (!projectInfo) {
    throw new Error(`Supabase CLI profile cannot see linked project ${ref}`);
  }
  return {
    backupInfo,
    orgPlan: "(unknown; SUPABASE_ACCESS_TOKEN not provided)",
    projectInfo,
    source: "Supabase CLI",
  };
}

async function loadMetadataFromManagementApi(token, ref) {
  const projectInfo = await managementFetch(token, `/projects/${ref}`);
  const orgId = projectInfo?.organization_id;
  const orgInfo = orgId ? await managementFetch(token, `/organizations/${orgId}`) : null;
  const backupInfo = await managementFetch(token, `/projects/${ref}/database/backups`);
  return {
    backupInfo,
    orgPlan: String(orgInfo?.plan ?? "unknown"),
    projectInfo,
    source: "Supabase Management API",
  };
}

async function tableRowsFromServiceRole(supabaseUrl) {
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  assert(serviceKey, "SUPABASE_SERVICE_ROLE_KEY is required when SUPABASE_ACCESS_TOKEN is absent");
  if (env("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")) {
    throw new Error("service role key must not be exposed as NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");
  }

  const { createClient } = require("@supabase/supabase-js");
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rows = [];
  for (const tableName of REQUIRED_TABLES) {
    const { error } = await admin
      .from(tableName)
      .select("*", { count: "exact", head: true });
    if (error) {
      rows.push({ table_name: tableName, minimum_rows: 0, row_count: -1, error: error.message });
    } else {
      rows.push({ table_name: tableName, minimum_rows: 0, row_count: 0 });
    }
  }
  return rows;
}

async function tableRowsFromManagementApi(token, ref) {
  const countQuery = `
    select source.table_name, source.minimum_rows, coalesce(stats.row_count, 0)::int as row_count
    from (values
      ${REQUIRED_TABLES.map((table) => `('${table}'::text, 0::int)`).join(",\n      ")}
    ) as source(table_name, minimum_rows)
    left join lateral (
      select count(*)::int as row_count
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = source.table_name
        and c.relkind in ('r', 'p')
    ) stats on true
    order by source.table_name;
  `;
  return runQuery(token, ref, countQuery);
}

async function main() {
  loadDotenv(path.join(root, ".env.production.local"));
  loadDotenv(path.join(root, ".env.local"));
  loadDotenv(path.join(root, ".env"));

  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`Usage:
  SUPABASE_ACCESS_TOKEN=<management token> \\
  SUPABASE_PROJECT_REF=<project ref> \\
  npm run check:supabase-backups

Alternative:
  NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co can be used instead of SUPABASE_PROJECT_REF.

Fallback:
  When SUPABASE_ACCESS_TOKEN is not set, this script uses the authenticated
  Supabase CLI for project/backup metadata and SUPABASE_SERVICE_ROLE_KEY for
  table visibility checks.
`);
    return;
  }

  const token = env("SUPABASE_ACCESS_TOKEN");
  const configuredSupabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL");
  const ref = env("SUPABASE_PROJECT_REF") || projectRefFromUrl(configuredSupabaseUrl);
  assert(ref, "SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL is required");
  const supabaseUrl = configuredSupabaseUrl || `https://${ref}.supabase.co`;

  const metadata = token
    ? await loadMetadataFromManagementApi(token, ref)
    : await loadMetadataFromCli(ref);
  const { backupInfo, orgPlan, projectInfo, source } = metadata;
  const backups = Array.isArray(backupInfo?.backups) ? backupInfo.backups : [];
  const completedBackups = backups.filter((backup) => backup?.status === "COMPLETED");

  const tableRows = token
    ? await tableRowsFromManagementApi(token, ref)
    : await tableRowsFromServiceRole(supabaseUrl);
  const missingTables = tableRows.filter(
    (row) => row.error || Number(row.row_count) < Number(row.minimum_rows),
  );
  if (missingTables.length) {
    throw new Error(
      `required tables missing from schema: ${missingTables.map((row) => `${row.table_name}${row.error ? ` (${row.error})` : ""}`).join(", ")}`,
    );
  }

  console.log(`Supabase backup metadata for ${ref}:`);
  console.log(`- metadata source: ${source}`);
  console.log(`- organization plan: ${orgPlan}`);
  console.log(`- database version: ${projectInfo?.database?.version ?? "(unknown)"}`);
  console.log(`- region: ${backupInfo.region ?? "(unknown)"}`);
  console.log(`- PITR enabled: ${backupInfo.pitr_enabled === true}`);
  console.log(`- WAL-G enabled: ${backupInfo.walg_enabled === true}`);
  console.log(`- completed backups: ${completedBackups.length}`);
  console.log(`- required app tables visible: ${tableRows.length}`);

  if (!backupInfo.pitr_enabled && completedBackups.length < 1) {
    if (orgPlan === "free") {
      throw new Error(
        "No PITR window or completed daily backup is available, and the Supabase organization is on the free plan. Supabase restore-to-new-project and PITR are paid-plan capabilities; upgrade/enable managed backups, restore the latest backup into a non-production project, then rerun the production verifier against that restore target.",
      );
    }
    throw new Error(
      "No PITR window or completed daily backup is available. Upgrade/enable Supabase backups, then restore the latest backup into a non-production project and rerun the production verifier against that restore target.",
    );
  }

  console.log("Supabase backup readiness OK: at least one restorable backup path is available.");
}

main().catch((err) => {
  console.error("Supabase backup readiness FAIL:");
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
