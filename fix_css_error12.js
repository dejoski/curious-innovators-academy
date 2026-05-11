const fs = require('fs');

// The error is in the minified output from Next.js.
// Let's check the files we edited for any syntax errors that might cause this.
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
    
    // Check for unescaped quotes or weird characters
    if (value.includes('"') || value.includes('\'')) {
      console.log(`Found quotes in ${file}: ${value}`);
    }
  }
}
