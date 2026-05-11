const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/students/page.tsx', 'utf8');

// Fix the specific button container to wrap correctly
content = content.replace(
  '          <div className="flex gap-[16px] items-center overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">',
  '          <div className="flex flex-wrap gap-[16px] items-center w-full sm:w-auto pb-2 sm:pb-0 justify-start sm:justify-end">'
);

fs.writeFileSync('src/app/dashboard/students/page.tsx', content);
