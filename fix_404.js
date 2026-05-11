const fs = require('fs');

// 1. Fix Sidebar Links
let sidebarContent = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
sidebarContent = sidebarContent.replace(
  '<Link href="/dashboard/classes" className="text-[#666d80] text-[13px] hover:text-[#272932] py-[4px] font-medium">All Classes</Link>',
  '<Link href="/dashboard/classes/core" className="text-[#666d80] text-[13px] hover:text-[#272932] py-[4px] font-medium">All Classes</Link>'
);
sidebarContent = sidebarContent.replace(
  '<Link href="/dashboard/students/profiles" className="text-[#666d80] text-[13px] hover:text-[#272932] py-[4px] font-medium">Profiles</Link>',
  '<Link href="/dashboard/students/1" className="text-[#666d80] text-[13px] hover:text-[#272932] py-[4px] font-medium">Profiles</Link>'
);
fs.writeFileSync('src/components/Sidebar.tsx', sidebarContent);

// 2. Fix Schedule Page Button
let scheduleContent = fs.readFileSync('src/app/dashboard/schedule/page.tsx', 'utf8');
scheduleContent = scheduleContent.replace(
  '<button className="bg-[#14c1d5] flex items-center justify-center px-[16px] py-[8px] rounded-[6px] hover:bg-[#12aebd] transition-colors shadow-sm">',
  '<Link href="/dashboard/classes/core" className="bg-[#14c1d5] flex items-center justify-center px-[16px] py-[8px] rounded-[6px] hover:bg-[#12aebd] transition-colors shadow-sm">'
);
scheduleContent = scheduleContent.replace(
  '          </button>\n        </div>\n\n        <div className="flex flex-col gap-0 w-full border border-[#f0f0f0] rounded-xl overflow-hidden">',
  '          </Link>\n        </div>\n\n        <div className="flex flex-col gap-0 w-full border border-[#f0f0f0] rounded-xl overflow-hidden">'
);
fs.writeFileSync('src/app/dashboard/schedule/page.tsx', scheduleContent);

