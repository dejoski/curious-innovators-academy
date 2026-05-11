const fs = require('fs');
const { execSync } = require('child_process');

// If there's no py-0.5 in the code, why is Tailwind generating it?
// Ah! Tailwind v4 generates all default utilities by default in some configurations,
// or maybe it's finding it in a node_module or a comment.
// Let's check if there are ANY decimals in the whole project.
try {
  const output = execSync('grep -rE "class(Name)?=.*-[0-9]+\\.[0-9]+" src/').toString();
  console.log("Any decimals found in:", output);
} catch (e) {
  console.log("No decimals found.");
}
