const fs = require('fs');
const { execSync } = require('child_process');

// If Tailwind v4 is causing issues with Next.js 16.2.4 (Turbopack),
// maybe we should downgrade to Tailwind v3 or disable Turbopack for the build.
// Let's check package.json
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log("Tailwind version:", pkg.devDependencies.tailwindcss);
console.log("PostCSS version:", pkg.devDependencies['@tailwindcss/postcss']);

// Let's try to disable Turbopack in the build script
pkg.scripts.build = "next build"; // It's already just `next build`, Turbopack is default in Next 15+
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
