#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function parseArgs(argv) {
  const args = {
    report: "fallow-report.json",
    history: ".codex/repowise-score-history.jsonl",
    noWrite: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--report") {
      args.report = argv[index + 1];
      index += 1;
    } else if (arg === "--history") {
      args.history = argv[index + 1];
      index += 1;
    } else if (arg === "--no-write") {
      args.noWrite = true;
    } else if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/repowise-score-snapshot.cjs [--report fallow-report.json] [--history .codex/repowise-score-history.jsonl] [--no-write]

Records a compact Fallow/RepoWise score snapshot for trend tracking.

Expected workflow:
  1. Run fallow/repowise as needed, for example:
     npx fallow --score --format json --output-file fallow-report.json
     npx repowise sync
  2. Record the current report:
     node scripts/repowise-score-snapshot.cjs
`);
}

function readText(filePath) {
  const buffer = fs.readFileSync(filePath);
  let text = buffer.toString("utf8");
  if (text.includes("\u0000")) {
    text = buffer.toString("utf16le");
  }
  return text.replace(/^\uFEFF/, "");
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(readText(filePath));
}

function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function groupBySeverity(findings) {
  return findings.reduce((counts, finding) => {
    const severity = finding.severity || "unknown";
    counts[severity] = (counts[severity] || 0) + 1;
    return counts;
  }, {});
}

function topHealthFindings(findings, limit = 10) {
  return findings
    .slice()
    .sort((left, right) => Number(right.crap || 0) - Number(left.crap || 0))
    .slice(0, limit)
    .map((finding) => ({
      path: finding.path,
      name: finding.name,
      line: finding.line,
      severity: finding.severity,
      crap: finding.crap,
      cyclomatic: finding.cyclomatic,
      cognitive: finding.cognitive,
      line_count: finding.line_count,
    }));
}

function topFileScores(fileScores, limit = 10) {
  return fileScores
    .slice()
    .sort((left, right) => {
      const rightRisk = Number(right.crap_max || 0) + Number(right.crap_above_threshold || 0) * 100;
      const leftRisk = Number(left.crap_max || 0) + Number(left.crap_above_threshold || 0) * 100;
      return rightRisk - leftRisk;
    })
    .slice(0, limit)
    .map((score) => ({
      path: score.path,
      maintainability_index: score.maintainability_index,
      crap_max: score.crap_max,
      crap_above_threshold: score.crap_above_threshold,
      total_cyclomatic: score.total_cyclomatic,
      total_cognitive: score.total_cognitive,
      dead_code_ratio: score.dead_code_ratio,
    }));
}

function buildSnapshot(reportPath) {
  const report = readJsonIfExists(reportPath);
  if (!report) {
    throw new Error(`Report not found: ${reportPath}`);
  }

  const repowiseState = readJsonIfExists(".repowise/state.json");
  const healthFindings = report.health?.findings || [];
  const fileScores = report.health?.file_scores || [];
  const checkSummary = report.check?.summary || {};
  const healthSummary = report.health?.summary || {};
  const vitalSigns = report.health?.vital_signs || {};
  const dupeStats = report.dupes?.stats || {};

  return {
    recorded_at: new Date().toISOString(),
    git: {
      branch: git(["branch", "--show-current"]),
      commit: git(["rev-parse", "HEAD"]),
      dirty_files: git(["status", "--short"])
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    },
    source: {
      report: reportPath,
      fallow_version: report.version || report.check?.version,
      repowise_last_sync_commit: repowiseState?.last_sync_commit || null,
      repowise_run_mode: repowiseState?.run_mode || null,
    },
    dead_code: {
      total_issues: report.check?.total_issues ?? checkSummary.total_issues ?? null,
      unused_files: checkSummary.unused_files ?? null,
      unused_exports: checkSummary.unused_exports ?? null,
      unused_types: checkSummary.unused_types ?? null,
      unused_dependencies: checkSummary.unused_dependencies ?? null,
      circular_dependencies: checkSummary.circular_dependencies ?? null,
      boundary_violations: checkSummary.boundary_violations ?? null,
    },
    duplication: {
      clone_groups: dupeStats.clone_groups ?? null,
      clone_instances: dupeStats.clone_instances ?? null,
      files_with_clones: dupeStats.files_with_clones ?? null,
      duplicated_lines: dupeStats.duplicated_lines ?? null,
      duplication_percentage: dupeStats.duplication_percentage ?? null,
    },
    health: {
      findings: healthFindings.length,
      severity: groupBySeverity(healthFindings),
      files_analyzed: healthSummary.files_analyzed ?? null,
      functions_analyzed: healthSummary.functions_analyzed ?? null,
      functions_above_threshold: healthSummary.functions_above_threshold ?? null,
      files_scored: healthSummary.files_scored ?? null,
      average_maintainability: healthSummary.average_maintainability ?? vitalSigns.maintainability_avg ?? null,
      hotspot_count: vitalSigns.hotspot_count ?? null,
      p90_cyclomatic: vitalSigns.p90_cyclomatic ?? null,
      dead_file_pct: vitalSigns.dead_file_pct ?? null,
      dead_export_pct: vitalSigns.dead_export_pct ?? null,
    },
    top_health_findings: topHealthFindings(healthFindings),
    top_file_scores: topFileScores(fileScores),
  };
}

function appendSnapshot(historyPath, snapshot) {
  fs.mkdirSync(path.dirname(historyPath), { recursive: true });
  fs.appendFileSync(historyPath, `${JSON.stringify(snapshot)}\n`);
}

function printSummary(snapshot, historyPath, wrote) {
  console.log(`# RepoWise/Fallow Score Snapshot

- Recorded: ${snapshot.recorded_at}
- Branch: ${snapshot.git.branch || "(unknown)"}
- Commit: ${snapshot.git.commit || "(unknown)"}
- Dirty files: ${snapshot.git.dirty_files.length}
- Fallow version: ${snapshot.source.fallow_version || "(unknown)"}
- RepoWise last sync commit: ${snapshot.source.repowise_last_sync_commit || "(unknown)"}

## Scores

- Dead-code issues: ${snapshot.dead_code.total_issues}
- Unused files: ${snapshot.dead_code.unused_files}
- Unused exports: ${snapshot.dead_code.unused_exports}
- Unused dependencies: ${snapshot.dead_code.unused_dependencies}
- Duplicate clone groups: ${snapshot.duplication.clone_groups}
- Duplication percentage: ${formatPercent(snapshot.duplication.duplication_percentage)}
- Health findings: ${snapshot.health.findings}
- Severity: ${JSON.stringify(snapshot.health.severity)}
- Average maintainability: ${snapshot.health.average_maintainability}
- Functions above threshold: ${snapshot.health.functions_above_threshold}

## Top Refactor Targets
${snapshot.top_health_findings
  .slice(0, 5)
  .map((finding, index) => `${index + 1}. ${finding.path}:${finding.line} ${finding.name} (${finding.severity}, CRAP ${finding.crap})`)
  .join("\n")}

${wrote ? `Appended to ${historyPath}` : "Dry run only; history was not updated."}`);
}

function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "(unknown)";
  }
  return `${Number(value).toFixed(2)}%`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const snapshot = buildSnapshot(args.report);
  if (!args.noWrite) {
    appendSnapshot(args.history, snapshot);
  }
  printSummary(snapshot, args.history, !args.noWrite);
}

main();
