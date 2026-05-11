const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/app/dashboard/page.tsx',
  'src/app/login/page.tsx'
];

filesToUpdate.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) return;

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Add href="#" to any Link missing it
  content = content.replace(/<Link(\s+className=)/g, '<Link href="#"$1');
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated ${filePath}`);
});
