const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/parents/page.tsx', 'utf8');

// Add a click outside listener for the action dropdown
content = content.replace(
  'const filterRef = React.useRef<HTMLDivElement>(null);',
  `const filterRef = React.useRef<HTMLDivElement>(null);
  const actionRef = React.useRef<HTMLDivElement>(null);`
);

content = content.replace(
  'if (filterRef.current && !filterRef.current.contains(event.target as Node)) {',
  `if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
      if (actionRef.current && !actionRef.current.contains(event.target as Node)) {
        setOpenActionId(null);
      }`
);

content = content.replace(
  '<div className={`flex items-center justify-center relative ${openActionId === parent.id ? "z-[100]" : ""}`}>',
  '<div className={`flex items-center justify-center relative ${openActionId === parent.id ? "z-[100]" : ""}`} ref={openActionId === parent.id ? actionRef : null}>'
);

fs.writeFileSync('src/app/dashboard/parents/page.tsx', content);
