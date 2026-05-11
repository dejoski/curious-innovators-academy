const fs = require('fs');
const { execSync } = require('child_process');

// It's still generating `.py-0\.5`. Why? Because Tailwind v4 generates all default spacing scale values by default.
// The issue is that Turbopack's CSS parser is choking on the escaped dot `\.` in the class name.
// This is a known bug in Next.js 15+ with Turbopack and Tailwind v4.

// The fix is to disable Turbopack for `next build`.
// Wait, `next build` doesn't use Turbopack by default unless specified, but the output says:
// "▲ Next.js 16.2.4 (Turbopack)"
// Let's check package.json to see if there's a next.config.ts enabling it.
try {
  const nextConfig = fs.readFileSync('next.config.ts', 'utf8');
  console.log("next.config.ts:", nextConfig);
} catch (e) {
  console.log("No next.config.ts found.");
}
