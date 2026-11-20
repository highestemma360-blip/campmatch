const fs = require('fs');
const filePath = 'C:\\Users\\user\\Downloads\\Telegram Desktop\\campmatch-complete\\frontend\\src\\pages\\AuthPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the closing section
const oldText = `      )}
    </div>
  )
}`;

const newText = `      )}
      {install.visible && (
        <InstallPrompt
          platform={install.platform}
          canPrompt={install.canPrompt}
          onInstall={install.install}
          onClose={install.close}
          nextReminderSeconds={install.nextReminderSeconds}
        />
      )}
    </div>
  )
}`;

if (content.includes(oldText)) {
  content = content.replace(oldText, newText);
  fs.writeFileSync(filePath, content);
  console.log('Successfully replaced!');
} else {
  console.log('Could not find oldText');
  // Show what's at the end
  const lines = content.split('\n');
  console.log('Last 10 lines:');
  for (let i = lines.length - 10; i < lines.length; i++) {
    console.log(i + ': ' + JSON.stringify(lines[i]));
  }
}
