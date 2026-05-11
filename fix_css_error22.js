const fs = require('fs');

// Let's fix the decimal values in the files found above
const files = [
  'src/app/dashboard/parents/students/page.tsx',
  'src/app/dashboard/classes/requests/page.tsx',
  'src/app/dashboard/students/page.tsx',
  'src/app/login/page.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace w-2.5, h-2.5, etc.
    content = content.replace(/w-2\.5/g, 'w-3');
    content = content.replace(/h-2\.5/g, 'h-3');
    content = content.replace(/w-3\.5/g, 'w-4');
    content = content.replace(/h-3\.5/g, 'h-4');
    content = content.replace(/py-0\.5/g, 'py-1');
    
    // Replace negative inset percentages with whole numbers
    content = content.replace(/inset-\[-4\.62%_-4\.5%\]/g, 'inset-[-5%_-5%]');
    content = content.replace(/inset-\[-4\.5%_-5\.62%\]/g, 'inset-[-5%_-6%]');
    content = content.replace(/inset-\[-63\.91%_-35\.29%\]/g, 'inset-[-64%_-35%]');
    content = content.replace(/inset-\[-59\.46%_-25\.29%\]/g, 'inset-[-59%_-25%]');
    content = content.replace(/inset-\[-82\.47%_-55\.82%\]/g, 'inset-[-82%_-56%]');
    
    // Replace other decimal arbitrary values
    content = content.replace(/h-\[430\.1%\]/g, 'h-[430%]');
    content = content.replace(/left-\[-49\.86%\]/g, 'left-[-50%]');
    content = content.replace(/top-\[-152\.43%\]/g, 'top-[-152%]');
    content = content.replace(/w-\[153\.88%\]/g, 'w-[154%]');
    content = content.replace(/h-\[45\.405px\]/g, 'h-[45px]');
    content = content.replace(/top-\[-1\.41px\]/g, 'top-[-1px]');
    content = content.replace(/w-\[43\.322px\]/g, 'w-[43px]');
    
    fs.writeFileSync(file, content);
    console.log(`Fixed decimals in ${file}`);
  }
}
