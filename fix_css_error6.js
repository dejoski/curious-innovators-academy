const fs = require('fs');

// Check the changes made in fix_404.js
let scheduleContent = fs.readFileSync('src/app/dashboard/schedule/page.tsx', 'utf8');
if (scheduleContent.includes('</button>')) {
  console.log("Schedule still has </button>");
} else {
  console.log("Schedule </button> replaced");
}

// Let's revert the schedule change to see if it fixes the build
let scheduleOriginal = scheduleContent.replace(
  '<Link href="/dashboard/classes/core" className="bg-[#14c1d5] flex items-center justify-center px-[16px] py-[8px] rounded-[6px] hover:bg-[#12aebd] transition-colors shadow-sm">',
  '<button className="bg-[#14c1d5] flex items-center justify-center px-[16px] py-[8px] rounded-[6px] hover:bg-[#12aebd] transition-colors shadow-sm">'
);
scheduleOriginal = scheduleOriginal.replace(
  '          </Link>\n        </div>\n\n        <div className="flex flex-col gap-0 w-full border border-[#f0f0f0] rounded-xl overflow-hidden">',
  '          </button>\n        </div>\n\n        <div className="flex flex-col gap-0 w-full border border-[#f0f0f0] rounded-xl overflow-hidden">'
);
fs.writeFileSync('src/app/dashboard/schedule/page.tsx', scheduleOriginal);

