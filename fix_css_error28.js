const fs = require('fs');

// Let's fix the decimal values in the components
const files = [
  'src/components/DailyBlocks.tsx',
  'src/components/DashboardHeader.tsx',
  'src/components/Sidebar.tsx',
  'src/components/Frame40903.tsx',
  'src/components/Frame40902.tsx',
  'src/components/Frame40904.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace negative inset percentages with whole numbers
    content = content.replace(/inset-\[-4\.62%_-4\.5%\]/g, 'inset-[-5%_-5%]');
    content = content.replace(/inset-\[-0\.5px_-2\.08%\]/g, 'inset-[-1px_-2%]');
    content = content.replace(/inset-\[-9\.76%_-8\.33%_-16\.67%_-8\.33%\]/g, 'inset-[-10%_-8%_-17%_-8%]');
    content = content.replace(/inset-\[-5%_-6\.25%\]/g, 'inset-[-5%_-6%]');
    content = content.replace(/inset-\[-4\.65%_-4\.55%\]/g, 'inset-[-5%_-5%]');
    content = content.replace(/inset-\[-4\.19%_-4\.09%\]/g, 'inset-[-4%_-4%]');
    content = content.replace(/inset-\[-4\.26%_-4\.3%\]/g, 'inset-[-4%_-4%]');
    content = content.replace(/inset-\[-4\.5%_-5\.63%\]/g, 'inset-[-5%_-6%]');
    
    // Replace other decimal arbitrary values
    content = content.replace(/top-\[-1\.41px\]/g, 'top-[-1px]');
    content = content.replace(/top-\[-0\.41px\]/g, 'top-[0px]');
    content = content.replace(/h-\[33\.81px\]/g, 'h-[34px]');
    content = content.replace(/w-\[32\.259px\]/g, 'w-[32px]');
    content = content.replace(/h-\[430\.1%\]/g, 'h-[430%]');
    content = content.replace(/left-\[-49\.86%\]/g, 'left-[-50%]');
    content = content.replace(/top-\[-152\.43%\]/g, 'top-[-152%]');
    content = content.replace(/w-\[153\.88%\]/g, 'w-[154%]');
    
    fs.writeFileSync(file, content);
    console.log(`Fixed decimals in ${file}`);
  }
}
