const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/ProfilePage.tsx', 'utf8');
// Find all 'if (screen' occurrences
let idx = 0;
while ((idx = content.indexOf("if (screen ===", idx)) !== -1) {
    const lineEnd = content.indexOf('\n', idx);
    console.log('Found at', idx, ':', content.slice(idx, lineEnd));
    idx++;
}
// Also check for hub
const hubIdx = content.indexOf("if (screen === 'hub')");
console.log('Hub at:', hubIdx);
// Find settings
const settingsIdx = content.indexOf("if (screen === 'settings')");
console.log('Settings at:', settingsIdx);
// Find hub
const hubScreenIdx = content.indexOf("screen === 'hub'");
console.log('Hub screen at:', hubScreenIdx);
