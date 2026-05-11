const fs = require('fs');

// Let's check for any CSS files that might be causing issues.
const { execSync } = require('child_process');

try {
  const output = execSync('find src -name "*.css"').toString();
  console.log("CSS files:", output);
} catch (e) {
  console.log("No CSS files found.");
}
