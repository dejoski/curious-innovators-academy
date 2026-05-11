const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/components/Sidebar.tsx',
  'src/components/DashboardHeader.tsx',
  'src/components/DailyBlocks.tsx'
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
