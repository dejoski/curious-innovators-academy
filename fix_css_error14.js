const fs = require('fs');
const { execSync } = require('child_process');

// Let's completely nuke the .next directory and node_modules/.cache
try {
  execSync('rm -rf .next node_modules/.cache');
  console.log("Cleared caches");
} catch (e) {
  console.log("Failed to clear caches");
}

// Let's also check if there's any weird CSS in the layout
const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
console.log("Layout classNames:", layout.match(/className="([^"]*)"/g));

