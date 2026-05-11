const fs = require('fs');
// Let's remove the @theme block entirely to see if that's causing the issue
fs.writeFileSync('src/app/globals.css', `
@import "tailwindcss";
`);
