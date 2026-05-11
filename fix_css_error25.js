const fs = require('fs');

// The error is still there. Let's find any class with a decimal point in it.
const { execSync } = require('child_process');

try {
  const output = execSync('grep -rE "class(Name)?=.*py-0\\.5" src/app/').toString();
  console.log("py-0.5 found in:", output);
} catch (e) {
  console.log("No py-0.5 found.");
}

try {
  const output = execSync('grep -rE "class(Name)?=.*px-0\\.5" src/app/').toString();
  console.log("px-0.5 found in:", output);
} catch (e) {
  console.log("No px-0.5 found.");
}
