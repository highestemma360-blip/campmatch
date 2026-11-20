const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\user\\Downloads\\Telegram Desktop\\campmatch-complete\\frontend\\src\\pages\\ProfilePage.tsx', 'utf8');
console.log('File length:', content.length);
// Find all 'if (screen' occurrences
let idx = 0;
while ((idx = content.indexOf("if (screen ===", idx)) !== -1) {
    const lineEnd = content.indexOf('\n', idx);
    console.log('Found at', idx, ':', content.slice(idx, lineEnd));
    idx++;
}
// Check if SCREEN 1 comment exists
const screen1Idx = content.indexOf('SCREEN 1');
console.log('SCREEN 1 at:', screen1Idx);
// Find the end of settings section - look for closing braces
const settingsEndIdx = content.lastIndexOf('      </div>');
console.log('Last </div> at:', settingsEndIdx);
if (settingsEndIdx !== -1) {
    console.log('Context after last </div>:');
    console.log(JSON.stringify(content.slice(settingsEndIdx, settingsEndIdx+200)));
}
