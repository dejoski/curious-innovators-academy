const fs = require('fs');

// Let's find all instances of decimal arbitrary values and change them
const files = [
  'src/app/dashboard/parents/classes/enrichment/page.tsx',
  'src/app/dashboard/classes/core/page.tsx',
  'src/app/dashboard/classes/enrichment/page.tsx',
  'src/app/dashboard/students/[id]/roster/page.tsx',
  'src/app/dashboard/students/[id]/page.tsx',
  'src/app/dashboard/parents/page.tsx',
  'src/app/dashboard/schedule/page.tsx',
  'src/components/Sidebar.tsx',
  'src/components/DashboardHeader.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // Find all decimal classes like w-1.5, h-2.5, etc.
    content = content.replace(/([a-z]+)-(\d+)\.5/g, '$1-$2');
    fs.writeFileSync(file, content);
    console.log(`Replaced decimals in ${file}`);
  }
}
