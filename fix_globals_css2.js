const fs = require('fs');
// It seems tailwindcss is throwing an error internally when parsing its own output.
// Let's try reverting to Tailwind v3 syntax if it's a Next.js 15 + Tailwind v4 issue,
// or just make sure it's as simple as possible.
fs.writeFileSync('src/app/globals.css', `
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-inter: 'Inter', sans-serif;
}
`);
