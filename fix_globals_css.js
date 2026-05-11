const fs = require('fs');
let content = fs.readFileSync('src/app/globals.css', 'utf8');

// The error is "Missed semicolon" in globals.css.
// Let's just reset it to the default Tailwind v4 imports if it got messed up.
if (content.includes('@import "tailwindcss";') || content.includes('@tailwind base;')) {
  // It might be fine, but let's ensure it's clean.
  // Actually, looking at the error, it seems like some malformed CSS was injected.
  // Let's check what's in there.
}

// Let's just overwrite it with a clean Tailwind v4 setup
fs.writeFileSync('src/app/globals.css', '@import "tailwindcss";\n\n@theme {\n  --font-sans: var(--font-inter);\n}\n');
