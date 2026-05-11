const fs = require('fs');

// The error is `py-0\.5`. This is a standard Tailwind class, but maybe Turbopack's PostCSS is failing on the escaped dot `\.`.
// Let's search the whole project for `py-0.5` and `px-0.5` and replace them with `py-1` and `px-1`.
const { execSync } = require('child_process');

try {
  const output = execSync('grep -rE "class(Name)?=.*p[xy]-0\\.5" src/').toString();
  console.log("Found p[xy]-0.5 in:", output);
} catch (e) {
  console.log("No p[xy]-0.5 found.");
}
