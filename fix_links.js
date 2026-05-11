const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/app/dashboard/teachers/page.tsx',
  'src/app/dashboard/students/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/login/page.tsx',
  'src/components/DailyBlocks.tsx',
  'src/components/DashboardHeader.tsx',
  'src/components/Sidebar.tsx'
];

filesToUpdate.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${fullPath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  // Add import if not present
  if (!content.includes('import Link from "next/link"') && !content.includes("import Link from 'next/link'")) {
    // Find the last import statement
    const importRegex = /^import.*$/gm;
    let match;
    let lastImportIndex = 0;
    while ((match = importRegex.exec(content)) !== null) {
      lastImportIndex = match.index + match[0].length;
    }
    
    if (lastImportIndex > 0) {
      content = content.slice(0, lastImportIndex) + '\nimport Link from "next/link";' + content.slice(lastImportIndex);
    } else {
      content = 'import Link from "next/link";\n' + content;
    }
  }

  // Replace <a href="..."> with <Link href="...">
  content = content.replace(/<a\s+href=/g, '<Link href=');
  // Replace </a> with </Link>
  content = content.replace(/<\/a>/g, '</Link>');

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  } else {
    console.log(`No changes needed in ${filePath}`);
  }
});
