const fs = require('fs');
const f = 'C:/Users/user/Downloads/Telegram Desktop/campmatch-complete/frontend/src/pages/AuthPage.tsx';
let l = fs.readFileSync(f, 'utf8').split('\n');
while (l.length && l[l.length - 1].trim() === '') l.pop();
fs.writeFileSync(f, l.join('\n'));
console.log('Fixed trailing empty lines');
