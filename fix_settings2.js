const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/ProfilePage.tsx', 'utf8');

// Fix && to & in section titles
content = content.replace(/Cache \&\& Cellular/g, 'Cache & Cellular');
content = content.replace(/Support \&\& About/g, 'Support & About');

// Fix double closing brace }  } to }
content = content.replace(/    \)  }\n/g, '    )\n  }\n');

// Remove the old duplicate settings section (from line 865 onwards)
// Find the start of the old settings section
const oldStartMarker = '  // ---\n        {/* === SCREEN 3: SETTINGS === */}';
const oldStartIdx = content.indexOf(oldStartMarker);
console.log('Old settings start at:', oldStartIdx);

// Find where the old settings section ends - look for the last '  }' before the next screen comment
const afterOldStart = content.slice(oldStartIdx);
// Find the closing of the old settings return - it ends with '      )\n    }\n  }\n\n  // ---\n  // SCREEN 1'
const endPattern = '      )\n    }\n  }\n\n  // ---\n  // SCREEN 1';
const endIdx = content.indexOf(endPattern, oldStartIdx);
console.log('Old settings end at:', endIdx);

if (oldStartIdx !== -1 && endIdx !== -1) {
    // Remove everything from oldStartIdx to endIdx (the entire old settings section)
    const newContent = content.slice(0, oldStartIdx) + content.slice(endIdx);
    fs.writeFileSync('frontend/src/pages/ProfilePage.tsx', newContent);
    console.log('Old settings section removed successfully');
} else {
    console.log('Could not find markers');
    console.log('oldStartIdx:', oldStartIdx, 'endIdx:', endIdx);
}
