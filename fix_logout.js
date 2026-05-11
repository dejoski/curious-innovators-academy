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
  
  // Replace the div wrapping the logout icon
  // <div className="flex items-center justify-center relative shrink-0">
  //   <div className="-scale-y-100 flex-none rotate-180">
  //     <div className="relative size-[24px]" data-node-id="..." data-name="solar:logout-2-outline">
  
  const regex = /<div className="flex items-center justify-center relative shrink-0">([\s\S]*?data-name="solar:logout-2-outline"[\s\S]*?<\/div>\s*<\/div>\s*)<\/div>/g;
  
  content = content.replace(regex, '<a href="/login" className="flex items-center justify-center relative shrink-0 cursor-pointer hover:opacity-80 transition-opacity">$1</a>');
  
  fs.writeFileSync(fullPath, content);
});
console.log('Done');
