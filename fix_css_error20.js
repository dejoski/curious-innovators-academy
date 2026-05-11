const fs = require('fs');

// Let's find all instances of py-0.5, px-0.5, gap-0.5, etc. and change them
const files = [
  'src/app/dashboard/parents/classes/enrichment/page.tsx',
  'src/app/dashboard/classes/core/page.tsx',
  'src/app/dashboard/classes/enrichment/page.tsx',
  'src/app/dashboard/students/[id]/roster/page.tsx',
  'src/app/dashboard/students/[id]/page.tsx',
  'src/app/dashboard/parents/page.tsx',
  'src/app/dashboard/schedule/page.tsx',
  'src/components/Sidebar.tsx',
  'src/components/DashboardHeader.tsx',
  'src/app/dashboard/classes/enrichment/[id]/page.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // Find all decimal classes like py-0.5
    content = content.replace(/([a-z]+)-0\.5/g, '$1-1');
    fs.writeFileSync(file, content);
    console.log(`Replaced 0.5 decimals in ${file}`);
  }
}
