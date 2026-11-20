const fs = require('fs');
const filePath = 'C:\\Users\\user\\Downloads\\Telegram Desktop\\campmatch-complete\\frontend\\src\\components\\StoryComponents.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix borderRadius: 50% -> borderRadius: '50%'
content = content.replace(/borderRadius: 50%/g, "borderRadius: '50%'");

fs.writeFileSync(filePath, content);
console.log('Fixed borderRadius issues');
