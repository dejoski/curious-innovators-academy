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
  
  // Fix "use client" order
  if (content.includes('"use client";')) {
    content = content.replace('import Link from "next/link";\n"use client";', '"use client";\nimport Link from "next/link";');
  }
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated ${filePath}`);
});
