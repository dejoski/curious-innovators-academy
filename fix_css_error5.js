const fs = require('fs');
// Let's check for any unclosed quotes or template literals in the files we edited
const files = [
  'src/app/dashboard/parents/page.tsx',
  'src/app/dashboard/schedule/page.tsx',
  'src/components/Sidebar.tsx'
];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const quotes = (content.match(/"/g) || []).length;
  const singleQuotes = (content.match(/'/g) || []).length;
  const backticks = (content.match(/`/g) || []).length;
  console.log(`${file}: "=${quotes} '=${singleQuotes} \`=${backticks}`);
}
