const fs = require('fs');
const content = fs.readFileSync('src/app/dashboard/schedule/page.tsx', 'utf8');
if (content.includes('<Link href="/dashboard/classes"')) {
  console.log("Schedule page View Classes button fix confirmed.");
} else {
  console.log("Schedule page View Classes button fix might be missing.");
}
