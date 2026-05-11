const fs = require('fs');

// Let's check for any unclosed brackets in the files we edited
const files = [
  'src/app/dashboard/parents/page.tsx',
  'src/app/dashboard/schedule/page.tsx',
  'src/components/Sidebar.tsx'
];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find all className attributes
  const classNames = content.match(/className="([^"]*)"/g) || [];
  
  for (const className of classNames) {
    const value = className.substring(11, className.length - 1);
    
    // Check for unclosed brackets
    const openBrackets = (value.match(/\[/g) || []).length;
    const closeBrackets = (value.match(/\]/g) || []).length;
    
    if (openBrackets !== closeBrackets) {
      console.log(`Unmatched brackets in ${file}: ${value}`);
    }
  }
}
