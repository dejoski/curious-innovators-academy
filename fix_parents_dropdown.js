const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/parents/page.tsx', 'utf8');

// Fix the z-index and overflow issue for the action dropdown
content = content.replace(
  '<div className="flex flex-col w-full min-h-[300px]">',
  '<div className="flex flex-col w-full min-h-[300px] pb-20">'
);

// Fix the filter dropdown by ensuring it's not hidden by overflow
content = content.replace(
  '<div className="bg-white border border-[#f0f0f0] rounded-[18px] flex flex-col shadow-sm w-full overflow-hidden">',
  '<div className="bg-white border border-[#f0f0f0] rounded-[18px] flex flex-col shadow-sm w-full">'
);

fs.writeFileSync('src/app/dashboard/parents/page.tsx', content);
