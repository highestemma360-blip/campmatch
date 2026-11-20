const fs = require('fs');
const filePath = 'C:\\Users\\user\\Downloads\\Telegram Desktop\\campmatch-complete\\frontend\\src\\components\\StoryComponents.tsx';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
console.log('Line 623:', JSON.stringify(lines[622]));
// Change </button> to </div> at line 623 (index 622)
if (lines[622].trim() === '</button>') {
  lines[622] = '      </div>';
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log('Fixed line 623: </button> -> </div>');
} else {
  console.log('Line 623 is:', JSON.stringify(lines[622]));
}
