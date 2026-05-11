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
  
  // Replace <Link className="..."> with <Link href="#" className="..."> for those missing href
  content = content.replace(/<Link(\s+className=)/g, '<Link href="#"$1');
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated ${filePath}`);
});
