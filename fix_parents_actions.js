const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/parents/page.tsx', 'utf8');

// The action dropdowns are likely hidden by overflow: hidden on the table row or container
content = content.replace(
  '<tr key={parent.id} className="border-b border-[#f0f0f0] hover:bg-[#f9fafb] transition-colors">',
  '<tr key={parent.id} className="border-b border-[#f0f0f0] hover:bg-[#f9fafb] transition-colors relative">'
);

fs.writeFileSync('src/app/dashboard/parents/page.tsx', content);
