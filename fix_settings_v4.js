const fs = require('fs');
const filePath = 'C:\\Users\\user\\Downloads\\Telegram Desktop\\campmatch-complete\\frontend\\src\\pages\\ProfilePage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find the start of the settings section content (after the header)
const startMarker = '        {/* === ACCOUNT === */}';
const startIdx = content.indexOf(startMarker);
console.log('Start at:', startIdx);

if (startIdx === -1) {
    console.log('Could not find start marker');
    process.exit(1);
}

// Find the end - the closing of the settings screen return
// Pattern: "        )}\r\n------------------------------------------------------------------------\r\n  // SCREEN 1: ..."
const endPattern = '        )}\r\n------------------------------------------------------------------------\r\n  // SCREEN 1: TINDER + BUMBLE PROFILE HUB (DEFAULT)';
const endIdx = content.indexOf(endPattern, startIdx);
console.log('End at:', endIdx);

if (endIdx === -1) {
    console.log('Could not find end marker');
    process.exit(1);
}

const removeEnd = endIdx + endPattern.length;

const newSettings = `        {/* === SETTINGS - PRODUCTION GRADE === */}
        {/* Clean sections matching Snapchat/TikTok/Instagram reference design */}
        <SettingsSection title="Safety and Privacy">
          <SettingsRow icon={<ShieldIcon size={18} />} label="Accessibility" trailing={<ChevronDownIcon size={16} />} />
          <SettingsRow icon={<UserIcon size={18} />} label="Contacts and location" trailing={<ChevronDownIcon size={16} />} />
        </SettingsSection>

        <SettingsSection title="Cache & Cellular">
          <SettingsRow icon={<DownloadIcon size={18} />} label="Offline videos" trailing={<ChevronDownIcon size={16} />} />
          <SettingsRow icon={<TrashIcon size={18} />} label="Free up space" trailing={<ChevronDownIcon size={16} />} />
          <SettingsRow icon={<BoltIcon size={18} />} label="Data Saver" trailing={<ChevronDownIcon size={16} />} />
        </SettingsSection>

        <SettingsSection title="Support & About">
          <SettingsRow icon={<ChatBubbleIcon size={18} />} label="Help Center" trailing={<ChevronDownIcon size={16} />} />
          <SettingsRow icon={<ShieldIcon size={18} />} label="Privacy Center" trailing={<ChevronDownIcon size={16} />} />
          <SettingsRow icon={<MegaphoneIcon size={18} />} label="Terms and Policies" trailing={<ChevronDownIcon size={16} />} />
        </SettingsSection>

        <SettingsSection title="Login">
          <SettingsRow icon={<UserIcon size={18} />} label="Switch account" />
          <SettingsRow icon={<BoltIcon size={18} />} label="Log out" trailing={<ChevronDownIcon size={16} />} onClick={onLogout} />
        </SettingsSection>

        {/* Footer */}
        <div style={{ padding: '30px 16px', textAlign: 'center', color: '#656770', fontSize: 12 }}>
          <div style={{ marginBottom: 4 }}>Campmatch v1.0.0</div>
          <div>Made with \u2764\ufe0f in Ghana</div>
        </div>
      </div>
    )
  }`;

    const newContent = content.slice(0, startIdx) + newSettings + content.slice(removeEnd);
    fs.writeFileSync(filePath, newContent);
    console.log('Settings section replaced successfully');
    console.log('New length:', newContent.length);
    
    // Verify no duplicates
    const signOutCount = (newContent.match(/Sign Out/g) || []).length;
    const logOutCount = (newContent.match(/Log out/g) || []).length;
    console.log('Sign Out count:', signOutCount);
    console.log('Log out count:', logOutCount);
