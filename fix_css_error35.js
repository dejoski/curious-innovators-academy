const fs = require('fs');
const { execSync } = require('child_process');

// The error is `Missed semicolon` in the generated CSS.
// This is definitely a PostCSS/Tailwind v4 integration issue with Next.js Turbopack.
// Let's check `postcss.config.mjs`
const postcss = fs.readFileSync('postcss.config.mjs', 'utf8');
console.log("postcss.config.mjs:");
console.log(postcss);

// Let's try changing it to a standard CommonJS config
fs.writeFileSync('postcss.config.js', `module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};`);
execSync('rm postcss.config.mjs');
console.log("Changed to postcss.config.js");
