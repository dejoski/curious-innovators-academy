const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/dashboard/parents/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove Menu
content = content.replace(/<div className="fixed bg-\[#fafafa\] border-\[#f0f0f0\] border-r border-solid content-stretch flex flex-col h-screen items-start left-0 top-0 w-\[272px\] z-20" data-node-id="[^"]+" data-name="Menu">[\s\S]*?<\/div>\n      <\/div>\n      <\/div>\n      <\/div>/, '');

// The regex above might be brittle. Let's just use string manipulation.
