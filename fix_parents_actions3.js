const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/parents/page.tsx', 'utf8');

// Ensure the filter dropdown has a high z-index
content = content.replace(
  'className="absolute top-full right-0 mt-1 w-36 bg-white border border-[#f0f0f0] rounded-md shadow-lg z-10 py-1"',
  'className="absolute top-full right-0 mt-1 w-36 bg-white border border-[#f0f0f0] rounded-md shadow-lg z-50 py-1"'
);

fs.writeFileSync('src/app/dashboard/parents/page.tsx', content);
