const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/parents/page.tsx', 'utf8');

// Ensure the action dropdown is positioned correctly and has a high z-index
content = content.replace(
  '<div className={`flex items-center justify-center relative ${openActionId === parent.id ? "z-50" : ""}`}>',
  '<div className={`flex items-center justify-center relative ${openActionId === parent.id ? "z-[100]" : ""}`}>'
);

content = content.replace(
  'className="absolute right-[32px] top-1/2 -translate-y-1/2 mt-1 w-36 bg-white border border-[#f0f0f0] rounded-md shadow-lg z-50 py-1"',
  'className="absolute right-[32px] top-full mt-1 w-36 bg-white border border-[#f0f0f0] rounded-md shadow-lg z-[100] py-1"'
);

fs.writeFileSync('src/app/dashboard/parents/page.tsx', content);
