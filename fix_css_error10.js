const fs = require('fs');

// Let's check for any CSS syntax errors in the globals.css output directly
// by running postcss on it.
const { execSync } = require('child_process');

try {
  // Let's create a minimal test file to see if Tailwind itself is breaking
  fs.writeFileSync('test.css', '@import "tailwindcss";');
  execSync('npx tailwindcss -i test.css -o output.css');
  console.log("Tailwind compiled test.css successfully.");
} catch (e) {
  console.log("Tailwind failed to compile test.css:", e.message);
  if (e.stdout) console.log(e.stdout.toString());
  if (e.stderr) console.log(e.stderr.toString());
}
