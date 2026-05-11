const fs = require('fs');
// Let's check if there's a syntax error in one of the other CSS files that's being imported
// or if there's a malformed class name in the TSX files that tailwind is choking on.
// The error says "Missed semicolon" in the generated CSS. This usually happens when
// Tailwind encounters a malformed arbitrary value like `w-[calc(100%-20px]` (missing closing paren)
// or similar.

// Let's search for arbitrary values that might be malformed.
const { execSync } = require('child_process');
try {
  const output = execSync('grep -r "\\[" src/app/ | grep -v "\\]"').toString();
  console.log("Unmatched brackets:", output);
} catch (e) {
  console.log("No unmatched brackets found.");
}
