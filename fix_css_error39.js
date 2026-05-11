const fs = require('fs');

// The dev server is running on port 3000 now.
// Let's check if the CSS is still broken in dev mode.
// Actually, Turbopack in dev mode might also fail if it encounters the same CSS error.
// The error was: `Missed semicolon` in globals.css due to Tailwind v4.
// Let's see if we can hit the page and see if it loads.
const { execSync } = require('child_process');

try {
  const output = execSync('curl -s http://localhost:3000/dashboard/parents | grep "bg-white"').toString();
  if (output.includes('bg-white')) {
    console.log("Dev server is serving the page successfully!");
  } else {
    console.log("Page loaded but no bg-white found.");
  }
} catch (e) {
  console.log("Failed to load page from dev server:", e.message);
}
