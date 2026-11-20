const fs = require('fs');
const filePath = 'C:\\Users\\user\\Downloads\\Telegram Desktop\\campmatch-complete\\frontend\\src\\pages\\ProfilePage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Remove duplicate SESSION section (second Sign Out button, Terms/Privacy links, legal modal)
// Find: "        {/* === SESSION === */}" (the second occurrence)
const sessionMarker = '        {/* === SESSION === */}';
const firstIdx = content.indexOf(sessionMarker);
const secondIdx = content.indexOf(sessionMarker, firstIdx + 1);
console.log('First SESSION at:', firstIdx);
console.log('Second SESSION at:', secondIdx);

if (secondIdx !== -1) {
    // Find the end of the second SESSION section - look for "      </div>\n    )\n  }" followed by blank line and comment
    const endPattern = '      </div>\r\n    )\r\n  }\r\n\r\n  // ---';
    const endIdx = content.indexOf(endPattern, secondIdx);
    console.log('End of second SESSION at:', endIdx);
    
    if (endIdx !== -1) {
        const removeEnd = endIdx + endPattern.length;
        const newContent = content.slice(0, secondIdx) + content.slice(removeEnd);
        fs.writeFileSync(filePath, newContent);
        console.log('Duplicate SESSION section removed');
        console.log('New length:', newContent.length);
        
        // Verify
        const signOutCount = (newContent.match(/Sign Out/g) || []).length;
        console.log('Sign Out count:', signOutCount);
    } else {
        console.log('Could not find end of second SESSION section');
    }
} else {
    console.log('Only one SESSION section found - no duplicate to remove');
}
