const fs = require('fs');

let content = fs.readFileSync('INTERACTIONS_TRACKING.md', 'utf8');

// Update Class Detail (Enrichment)
content = content.replace(
  '- [ ] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - "Back to Class List" link: Navigate to Classes page',
  '- [x] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - "Back to Class List" link: Navigate to Classes page'
);
content = content.replace(
  '- [ ] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - "Review Requests" button: Open Review Requests modal/page',
  '- [x] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - "Review Requests" button: Open Review Requests modal/page'
);
content = content.replace(
  '- [ ] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - "Edit Info" button: Open Edit Class Info modal',
  '- [x] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - "Edit Info" button: Open Edit Class Info modal'
);
content = content.replace(
  '- [ ] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - "Remove Class" button: Open Remove Class confirmation modal',
  '- [x] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - "Remove Class" button: Open Remove Class confirmation modal'
);
content = content.replace(
  '- [ ] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - Search Input: Filter enrolled students',
  '- [x] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - Search Input: Filter enrolled students'
);
content = content.replace(
  '- [ ] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - "Filter by" dropdown: Open filter options',
  '- [x] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - "Filter by" dropdown: Open filter options'
);
content = content.replace(
  '- [ ] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - "Sort" dropdown: Open sort options',
  '- [x] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - "Sort" dropdown: Open sort options'
);
content = content.replace(
  '- [ ] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - "Select All" button: Select all students',
  '- [x] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - "Select All" button: Select all students'
);
content = content.replace(
  '- [ ] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - "Add Student" button: Open Add Student modal',
  '- [x] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - "Add Student" button: Open Add Student modal'
);
content = content.replace(
  '- [ ] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - Row Checkboxes: Select individual student',
  '- [x] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - Row Checkboxes: Select individual student'
);
content = content.replace(
  '- [ ] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - Row Action Ellipsis: Open action menu (Edit, Remove)',
  '- [x] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - Row Action Ellipsis: Open action menu (Edit, Remove)'
);
content = content.replace(
  '- [ ] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - Pagination: Navigate pages',
  '- [x] `src/app/dashboard/classes/enrichment/[id]/page.tsx` - Pagination: Navigate pages'
);

fs.writeFileSync('INTERACTIONS_TRACKING.md', content);

// Update FIGMA_TRACKING.md
let figmaContent = fs.readFileSync('FIGMA_TRACKING.md', 'utf8');
figmaContent = figmaContent.replace(
  '- [ ] Classes / Core (Node ID: 130-3681) -> `src/app/dashboard/classes/core/[id]/page.tsx`',
  '- [x] Classes / Core (Node ID: 130-3681) -> `src/app/dashboard/classes/core/[id]/page.tsx`'
);
fs.writeFileSync('FIGMA_TRACKING.md', figmaContent);
