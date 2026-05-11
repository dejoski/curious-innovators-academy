const { execSync } = require('child_process');

try {
  // Let's check for malformed arbitrary values in Tailwind classes
  const output = execSync('grep -rE "class(Name)?=.*w-\\[" src/app/ | grep -v "\\]"').toString();
  console.log("Malformed w-[] classes:", output);
} catch (e) {
  console.log("No malformed w-[] classes found.");
}

try {
  const output = execSync('grep -rE "class(Name)?=.*h-\\[" src/app/ | grep -v "\\]"').toString();
  console.log("Malformed h-[] classes:", output);
} catch (e) {
  console.log("No malformed h-[] classes found.");
}

try {
  const output = execSync('grep -rE "class(Name)?=.*text-\\[" src/app/ | grep -v "\\]"').toString();
  console.log("Malformed text-[] classes:", output);
} catch (e) {
  console.log("No malformed text-[] classes found.");
}
