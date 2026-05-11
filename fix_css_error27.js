const fs = require('fs');
const { execSync } = require('child_process');

// Let's check if there are any other files that might be causing this
try {
  const output = execSync('grep -rE "class(Name)?=.*-[0-9]+\\.[0-9]+" src/').toString();
  console.log("Any decimals found in:", output);
} catch (e) {
  console.log("No decimals found.");
}

// Let's also check components
try {
  const output = execSync('grep -rE "class(Name)?=.*-[0-9]+\\.[0-9]+" src/components/').toString();
  console.log("Any decimals in components found in:", output);
} catch (e) {
  console.log("No decimals in components found.");
}
