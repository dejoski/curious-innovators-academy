const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/parents/page.tsx', 'utf8');

// Ensure the action dropdown has a high z-index
content = content.replace(
  '<div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">',
  '<div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">'
);

fs.writeFileSync('src/app/dashboard/parents/page.tsx', content);
