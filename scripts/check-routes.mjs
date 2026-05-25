#!/usr/bin/env node
/**
 * Static check: internal href/router paths vs Next.js App Router page segments under src/app.
 *
 * Run from repo root:
 *   node scripts/check-routes.mjs
 *   npm run check:routes
 *
 * Exits 1 if any referenced path has no matching route; 0 otherwise.
 * Skips: external URLs, mailto, tel, javascript schemes, hash-only anchors,
 * and dynamic template tails after `${` (prefix path is still validated).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
const APP = path.join(SRC, "app");

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .filter((e) => !e.name.startsWith("_"))
    .filter((e) => !e.name.startsWith("."))
    .map((e) => e.name);
}

function hasPage(dir) {
  return (
    fs.existsSync(path.join(dir, "page.tsx")) ||
    fs.existsSync(path.join(dir, "page.jsx"))
  );
}

/** Next.js App Router: resolve URL path segments against `dir`. */
function routeMatches(dir, segments, i) {
  if (i >= segments.length) {
    return hasPage(dir);
  }

  const dirs = listDirs(dir);
  const routeGroups = dirs.filter((n) => n.startsWith("(") && n.endsWith(")"));
  const normal = dirs.filter((n) => !(n.startsWith("(") && n.endsWith(")")));

  for (const g of routeGroups) {
    if (routeMatches(path.join(dir, g), segments, i)) return true;
  }

  const seg = segments[i];

  if (normal.includes(seg)) {
    if (routeMatches(path.join(dir, seg), segments, i + 1)) return true;
  }

  const dynamicFolders = normal.filter((n) => /^\[[^\]]+\]$/.test(n));
  for (const d of dynamicFolders) {
    if (routeMatches(path.join(dir, d), segments, i + 1)) return true;
  }

  return false;
}

function normalizeUrlPath(raw) {
  if (!raw || typeof raw !== "string") return null;
  let p = raw.trim();
  if (!p.startsWith("/")) return null;
  if (p.startsWith("//")) return null;
  const lower = p.toLowerCase();
  if (lower.startsWith("http:") || lower.startsWith("https:")) return null;
  if (lower.startsWith("mailto:") || lower.startsWith("tel:") || lower.startsWith("javascript:")) {
    return null;
  }
  const hash = p.indexOf("#");
  if (hash === 0) return null;
  if (hash !== -1) p = p.slice(0, hash);
  const q = p.indexOf("?");
  if (q !== -1) p = p.slice(0, q);
  if (p.length > 1 && p.endsWith("/")) p = p.replace(/\/+$/, "");
  return p;
}

function collectTsFiles(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) collectTsFiles(full, out);
    else if (/\.(tsx|ts)$/.test(ent.name)) out.push(full);
  }
  return out;
}

/**
 * Extract internal path literals from source text.
 * Types: href="/x", href='/x', href={"/x"}, href={`/x/${…}`}, router.push("/x"), router.push(`/x/${…}`)
 */
function extractPathsFromSource(text, filePath) {
  const found = [];

  const record = (rawPath, line, kind) => {
    const n = normalizeUrlPath(rawPath);
    if (!n) return;
    found.push({ path: n, file: filePath, line, kind });
  };

  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // href="/example" or href='/example'
    const hrefQuoted = /\bhref\s*=\s*["'](\/[^"'`]*)["']/g;
    let m;
    while ((m = hrefQuoted.exec(line)) !== null) {
      record(m[1], lineNum, "href");
    }

    // href={"/example"} or href={'/example'}
    const hrefBrace = /\bhref\s*=\s*\{\s*["'](\/[^"']*)["']\s*\}/g;
    while ((m = hrefBrace.exec(line)) !== null) {
      record(m[1], lineNum, "href");
    }

    // href={`/prefix/${...}`  — validate static prefix (dynamic tail matches [param])
    const hrefTpl = /\bhref\s*=\s*\{\s*`([^`${]*)/g;
    while ((m = hrefTpl.exec(line)) !== null) {
      record(m[1], lineNum, "href-template");
    }

    // router.push("/example") or router.push('/example')
    const pushQuoted = /\brouter\.push\s*\(\s*["'](\/[^"']*)["']/g;
    while ((m = pushQuoted.exec(line)) !== null) {
      record(m[1], lineNum, "router.push");
    }

    // router.push(`/prefix/${...}`)
    const pushTpl = /\brouter\.push\s*\(\s*`([^`${]*)/g;
    while ((m = pushTpl.exec(line)) !== null) {
      record(m[1], lineNum, "router.push-template");
    }
  });

  return found;
}

function pathExistsInApp(urlPath) {
  const segments = urlPath.split("/").filter(Boolean);
  return routeMatches(APP, segments, 0);
}

function main() {
  if (!fs.existsSync(APP)) {
    console.error(`check-routes: missing ${path.relative(ROOT, APP)}`);
    process.exit(1);
  }

  const files = collectTsFiles(SRC);
  const all = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file);
    all.push(...extractPathsFromSource(text, rel));
  }

  const missing = [];
  const seen = new Set();
  for (const item of all) {
    const key = `${item.file}:${item.line}:${item.path}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const segments = item.path.split("/").filter(Boolean);

    // Template prefix ending mid-segment (e.g. `/example/bar-$`) — skip noisy cases
    const lastSeg = segments[segments.length - 1];
    if (lastSeg && lastSeg.includes("${")) continue;

    if (!routeMatches(APP, segments, 0)) {
      missing.push(item);
    }
  }

  if (missing.length === 0) {
    console.log(`check-routes: OK (${seen.size} unique internal path reference(s) checked)`);
    process.exit(0);
  }

  console.error("check-routes: missing route(s) for internal link(s):\n");
  for (const { path: p, file, line, kind } of missing) {
    console.error(`  ${p}`);
    console.error(`    ${file}:${line} (${kind})\n`);
  }
  process.exit(1);
}

main();
