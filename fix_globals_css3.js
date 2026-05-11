const fs = require('fs');
// Let's go back to the simplest possible Tailwind v4 setup.
fs.writeFileSync('src/app/globals.css', `
@import "tailwindcss";

@theme {
  --font-sans: var(--font-inter);
}
`);
