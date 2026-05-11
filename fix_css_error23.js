const fs = require('fs');

// Let's find any remaining decimal classes
const { execSync } = require('child_process');

try {
  const output = execSync('grep -rE "class(Name)?=.*-[0-9]+\\.[0-9]+" src/app/').toString();
  console.log("Classes with decimals:", output);
} catch (e) {
  console.log("No classes with decimals found.");
}
