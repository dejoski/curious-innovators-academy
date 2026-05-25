const fs = require("fs");
const path = require("path");

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

function loadDotenvFiles(root, names) {
  for (const name of names) {
    loadDotenv(path.join(root, name));
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

module.exports = {
  assert,
  env,
  loadDotenv,
  loadDotenvFiles,
  projectRefFromUrl,
};
