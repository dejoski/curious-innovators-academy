const fs = require('fs');

const xml = fs.readFileSync('/Users/dstaji01/.cursor/projects/Users-dstaji01-Desktop-curious-innovators-academy/agent-tools/e6b63043-aa33-4156-ba03-e444f1e41d31.txt', 'utf8');

// We want to find all top-level <frame> tags inside <canvas>
// We can do this by looking for <frame ...> that are indented by 2 spaces, or just parse it.
// Let's use a simple regex that looks for frames that have x and y coordinates that look like full screens (width >= 1024)
const frameRegex = /<frame\s+id="([^"]+)"\s+name="([^"]+)"\s+x="[^"]+"\s+y="[^"]+"\s+width="([^"]+)"\s+height="([^"]+)"/g;

let match;
const screens = [];
while ((match = frameRegex.exec(xml)) !== null) {
  const width = parseFloat(match[3]);
  const height = parseFloat(match[4]);
  // Most desktop screens are 1440x1024 or similar
  if (width >= 1000 && height >= 800) {
    screens.push({ id: match[1], name: match[2], width, height });
  }
}

fs.writeFileSync('screens.json', JSON.stringify(screens, null, 2));
console.log(`Found ${screens.length} potential screens.`);
