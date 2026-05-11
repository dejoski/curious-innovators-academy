const fs = require('fs');
const { execSync } = require('child_process');

try {
  execSync('npx @tailwindcss/cli -i src/app/globals.css -o .next/output.css');
  const output = fs.readFileSync('.next/output.css', 'utf8');
  
  // Find the exact character
  const minified = output.replace(/\n/g, '').replace(/\s+/g, ' ');
  console.log("Context around error:");
  console.log(minified.substring(28250, 28400));
} catch (e) {
  console.log("Failed to generate CSS:", e.message);
}
