const fs = require('fs');
const filePath = 'C:\\Users\\user\\Downloads\\Telegram Desktop\\campmatch-complete\\frontend\\src\\pages\\AuthPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Remove lines 469 and 470 (extra </div> and extra ))
const lines = content.split('\n');
console.log('Line 469:', JSON.stringify(lines[468]));
console.log('Line 470:', JSON.stringify(lines[469]));

// Remove lines 469 and 470 (0-indexed: 468 and 469)
lines.splice(468, 2);

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Fixed! Removed extra </div> and )');
console.log('New line 468:', JSON.stringify(lines[468] !== undefined ? lines[468] : 'N/A'));
console.log('New line 469:', JSON.stringify(lines[469] !== undefined ? lines[469] : 'N/A'));
