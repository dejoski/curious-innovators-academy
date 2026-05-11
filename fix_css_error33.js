const fs = require('fs');
const { execSync } = require('child_process');

// Let's check `src/app/globals.css` again.
const css = fs.readFileSync('src/app/globals.css', 'utf8');
console.log("globals.css content:");
console.log(css);

// Let's check if there's any weird character in globals.css
for (let i = 0; i < css.length; i++) {
  const code = css.charCodeAt(i);
  if (code > 127) {
    console.log(`Found non-ASCII character at index ${i}: ${css[i]} (code: ${code})`);
  }
}
