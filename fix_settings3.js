const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/ProfilePage.tsx', 'utf8');

// Fix && to & in section titles
content = content.replace(/Cache \&\& Cellular/g, 'Cache & Cellular');
content = content.replace(/Support \&\& About/g, 'Support & About');

// Fix double closing brace }  } to }
content = content.replace(/    \)  }\n/g, '    )\n  }\n');

// Remove old duplicate settings section
const oldStart = content.indexOf('  // ---------------------------------------------------------------------------\n        {/* === SCREEN 3: SETTINGS === */}');
console.log('Old start:', oldStart);

if (oldStart !== -1) {
    const oldEndPattern = '        )}\n      </div>\n    )\n  }\n\n  // ---------------------------------------------------------------------------\n  // SCREEN 1: TINDER + BUMBLE PROFILE HUB (DEFAULT)';
    const oldEnd = content.indexOf(oldEndPattern, oldStart);
    console.log('Old end:', oldEnd);
    
    if (oldEnd !== -1) {
        const removeEnd = oldEnd + oldEndPattern.length;
        const newContent = content.slice(0, oldStart) + content.slice(removeEnd);
        fs.writeFileSync('frontend/src/pages/ProfilePage.tsx', newContent);
        console.log('Old settings removed. New length:', newContent.length);
    } else {
        console.log('Could not find old end pattern');
    }
} else {
    console.log('Could not find old start');
}
