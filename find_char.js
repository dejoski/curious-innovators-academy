const fs = require('fs');
const css = fs.readFileSync('.next/output.css', 'utf8');
const minified = css.replace(/\n/g, '').replace(/\s+/g, ' ');
console.log("At 28098:");
console.log(minified.substring(28050, 28150));
