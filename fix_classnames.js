const fs = require('fs');
const path = require('path');

const files = [
  'src/app/dashboard/students/page.tsx',
  'src/app/dashboard/teachers/page.tsx',
  'src/app/dashboard/parents/page.tsx',
  'src/app/dashboard/schedule/page.tsx'
];

files.forEach(file => {
  const fullPath = path.join('/Users/dstaji01/Desktop/curious-innovators-academy', file);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Find tags with two classNames: <a ... className="old" ... className="old new">
  // Since we added the second one right before the closing bracket, we can just remove the first one.
  // Actually, let's just restore the files and do it cleanly.
  
  fs.writeFileSync(fullPath, content);
});
