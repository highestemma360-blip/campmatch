const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\user\\Downloads\\Telegram Desktop\\campmatch-complete\\frontend\\src\\pages\\ProfilePage.tsx', 'utf8');
// Check current settings section
const settingsIdx = content.indexOf("if (screen === 'settings')");
console.log('Settings screen at:', settingsIdx);
// Check for icons
['ShieldIcon', 'ContactsIcon', 'CloudDownloadIcon', 'TrashIcon', 'DataSaverIcon', 'HeadsetIcon', 'PrivacyIcon', 'InfoIcon', 'SwitchIcon', 'LogoutIcon', 'UserAvatar', 'ChevronRightIcon'].forEach(icon => {
    const found = content.includes(icon);
    console.log(icon + ':', found ? 'YES' : 'NO');
});
// Check for && 
console.log('Cache && Cellular:', content.includes('Cache && Cellular'));
console.log('Support && About:', content.includes('Support && About'));
// Check Sign Out count
console.log('Sign Out count:', (content.match(/Sign Out/g) || []).length);
console.log('Log out count:', (content.match(/Log out/g) || []).length);
