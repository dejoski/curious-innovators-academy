const fs = require('fs');

// Let's search the whole src directory, not just src/app
const { execSync } = require('child_process');

try {
  const output = execSync('grep -rE "class(Name)?=.*py-[0-9]+\\.[0-9]+" src/').toString();
  console.log("py-decimals found in:", output);
} catch (e) {
  console.log("No py-decimals found.");
}

try {
  const output = execSync('grep -rE "class(Name)?=.*px-[0-9]+\\.[0-9]+" src/').toString();
  console.log("px-decimals found in:", output);
} catch (e) {
  console.log("No px-decimals found.");
}
