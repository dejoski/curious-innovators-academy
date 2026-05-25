/**
 * Verifies email/password against Supabase Auth using the anon key only (same as the browser).
 * Does not print access tokens or session JWTs — only OK/FAIL and error messages.
 *
 * Usage:
 *   node scripts/verify-supabase-login.cjs <email> <password>
 *
 * Loads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local or .env if present.
 */

const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { loadDotenvFiles } = require("./lib/env.cjs");

const root = path.join(__dirname, "..");
loadDotenvFiles(root, [".env.local", ".env"]);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const email = process.argv[2];
const password = process.argv[3];

if (!url || !anonKey) {
  console.error(
    "FAIL: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set (e.g. in .env.local).",
  );
  process.exit(1);
}

if (!email || !password) {
  console.error("Usage: node scripts/verify-supabase-login.cjs <email> <password>");
  process.exit(1);
}

async function main() {
  const supabase = createClient(url, anonKey);
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("FAIL:", error.message);
    process.exit(2);
  }

  await supabase.auth.signOut();
  console.log("OK: sign-in succeeded (session cleared after check; no token printed).");
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(3);
});
