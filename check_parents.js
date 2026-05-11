const fs = require('fs');
const content = fs.readFileSync('src/app/dashboard/parents/page.tsx', 'utf8');
if (content.includes('z-50') && content.includes('openActionId === parent.id')) {
  console.log("Parents page action dropdown fix confirmed.");
} else {
  console.log("Parents page action dropdown fix might be missing.");
}
