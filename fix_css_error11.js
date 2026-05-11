const fs = require('fs');

// Tailwind compiled successfully with @tailwindcss/cli.
// The issue is with Next.js Turbopack and @tailwindcss/postcss.
// Let's check the output.css for any weirdness.
const output = fs.readFileSync('.next/output.css', 'utf8');

// The error was "Missed semicolon" at column 27992.
// Let's see what's around there.
const lines = output.split('\n');
let totalChars = 0;
for (let i = 0; i < lines.length; i++) {
  if (totalChars + lines[i].length > 27900 && totalChars < 28100) {
    console.log(`Line ${i + 1}: ${lines[i].substring(0, 100)}...`);
  }
  totalChars += lines[i].length + 1; // +1 for newline
}
