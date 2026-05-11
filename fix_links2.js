const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/app/dashboard/teachers/page.tsx',
  'src/app/dashboard/students/page.tsx'
];

filesToUpdate.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) return;

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // The issue is likely that some <a> tags didn't have href= but were just <a>
  // Let's replace any remaining <a> with <Link>
  content = content.replace(/<a(\s|>)/g, '<Link$1');
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated ${filePath}`);
});
