const fs = require('fs');
const { execSync } = require('child_process');

// The error keeps happening at character ~28000 in the minified CSS.
// Let's generate the CSS again and look exactly at that spot.
try {
  execSync('npx @tailwindcss/cli -i src/app/globals.css -o .next/output.css');
  const output = fs.readFileSync('.next/output.css', 'utf8');
  
  // Find the exact character
  const minified = output.replace(/\n/g, '').replace(/\s+/g, ' ');
  console.log("Context around error:");
  console.log(minified.substring(27900, 28100));
} catch (e) {
  console.log("Failed to generate CSS:", e.message);
}
