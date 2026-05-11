const fs = require('fs');
// Let's check the recently edited files for any weird CSS classes
const files = [
  'src/app/dashboard/parents/page.tsx',
  'src/app/dashboard/schedule/page.tsx',
  'src/components/Sidebar.tsx'
];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  // Just a quick regex to find weird characters in classNames
  const matches = content.match(/className="[^"]*[{};][^"]*"/g);
  if (matches) {
    console.log(`Found weird classNames in ${file}:`, matches);
  }
}
