const fs = require('fs');

// The error is still there. Let's find any class with a decimal point in it.
const { execSync } = require('child_process');

try {
  const output = execSync('grep -rE "class(Name)?=.*-[0-9]+\\.[0-9]+" src/app/').toString();
  console.log("Classes with decimals:", output);
} catch (e) {
  console.log("No classes with decimals found.");
}
