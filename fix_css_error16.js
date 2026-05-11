const fs = require('fs');

// Let's find all instances of py-1.5, px-1.5, gap-1.5, etc. and change them to py-2, px-2, gap-2
// Tailwind v4 sometimes has issues with decimal arbitrary values in certain configurations
const files = [
  'src/app/dashboard/parents/classes/enrichment/page.tsx',
  'src/app/dashboard/classes/core/page.tsx',
  'src/app/dashboard/classes/enrichment/page.tsx',
  'src/app/dashboard/students/[id]/roster/page.tsx',
  'src/app/dashboard/students/[id]/page.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/py-1\.5/g, 'py-2');
    content = content.replace(/px-1\.5/g, 'px-2');
    content = content.replace(/gap-1\.5/g, 'gap-2');
    content = content.replace(/p-1\.5/g, 'p-2');
    content = content.replace(/m-1\.5/g, 'm-2');
    content = content.replace(/my-1\.5/g, 'my-2');
    content = content.replace(/mx-1\.5/g, 'mx-2');
    fs.writeFileSync(file, content);
    console.log(`Replaced decimals in ${file}`);
  }
}
