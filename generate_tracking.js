const fs = require('fs');

const screens = JSON.parse(fs.readFileSync('screens.json', 'utf8'));

const implementedNodes = {
  "6:3": "src/app/dashboard/page.tsx",
  "125:443": "src/app/dashboard/classes/core/page.tsx",
  "363:7091": "src/app/dashboard/classes/enrichment/page.tsx",
  "246:3565": "src/app/dashboard/classes/requests/page.tsx",
  "250:3042": "src/app/dashboard/classes/approvals/page.tsx",
  "376:3883": "src/app/dashboard/parents/page.tsx",
  "376:4794": "src/app/dashboard/teachers/page.tsx",
  "250:4247": "src/app/dashboard/students/page.tsx",
  "378:8926": "src/app/dashboard/students/[id]/page.tsx",
  "350:3720": "src/app/dashboard/students/[id]/schedule/page.tsx",
  "313:2892": "src/app/dashboard/schedule/page.tsx",
  "188:3532": "src/app/dashboard/parents/classes/core/page.tsx",
  "237:2374": "src/app/dashboard/parents/classes/enrichment/page.tsx",
  "314:4014": "src/app/dashboard/parents/catalog/page.tsx",
  "188:3969": "src/app/dashboard/parents/students/page.tsx",
  "13:498": "src/app/login/page.tsx"
};

// Filter out internal components, grids, and generic frames
const validScreens = screens.filter(s => 
  s.name !== 'Grid' && 
  !s.name.includes('Component') &&
  !s.name.includes('Modal') &&
  !s.name.includes('Dropdown') &&
  !s.name.startsWith('Frame ') &&
  !s.name.startsWith('Group ') &&
  s.name !== 'Menu' &&
  s.name !== 'Content' &&
  s.name !== 'Style guide'
);

let md = `# Figma Screen Integration Tracker\n\n`;
md += `This file tracks all the top-level screens identified in the Figma file and whether they have been integrated into the Next.js application.\n\n`;

let total = 0;
let completed = 0;

function generateSection(title, filterFn) {
  let section = `## ${title}\n\n`;
  const filtered = validScreens.filter(filterFn);
  
  // Sort by implemented first, then name
  filtered.sort((a, b) => {
    const aImpl = !!implementedNodes[a.id];
    const bImpl = !!implementedNodes[b.id];
    if (aImpl && !bImpl) return -1;
    if (!aImpl && bImpl) return 1;
    return a.name.localeCompare(b.name);
  });

  filtered.forEach(s => {
    total++;
    const path = implementedNodes[s.id];
    if (path) completed++;
    const checkbox = path ? '[x]' : '[ ]';
    const pathText = path ? ` -> \`${path}\`` : '';
    section += `- ${checkbox} **${s.name}** (Node ID: \`${s.id}\`)${pathText}\n`;
  });
  return section + '\n';
}

let content = '';
content += generateSection('Admin Dashboard Screens', s => !s.name.startsWith('Parent -') && !s.name.startsWith('Login'));
content += generateSection('Parent Dashboard Screens', s => s.name.startsWith('Parent -'));
content += generateSection('Authentication / Other', s => s.name.startsWith('Login') || s.name.startsWith('Sign'));

md += `**Progress:** ${completed} / ${total} screens integrated (${Math.round((completed/total)*100)}%)\n\n`;
md += content;

fs.writeFileSync('FIGMA_TRACKING.md', md);
console.log(`Generated FIGMA_TRACKING.md (${completed}/${total})`);
