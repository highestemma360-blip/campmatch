const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/ProfilePage.tsx', 'utf8');

const startMarker = '        {/* === ACCOUNT === */}';
const endMarker = '  }\n\n  // ---';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx);

if (startIdx === -1) {
    console.log('START MARKER NOT FOUND');
} else if (endIdx === -1) {
    console.log('END MARKER NOT FOUND');
} else {
    const endBraceIdx = content.lastIndexOf('  }\n\n  // ---', startIdx, endIdx);
    console.log('Start:', startIdx, 'End brace:', endBraceIdx, 'End:', endIdx);

    const newSettings = `        {/* === SETTINGS - PRODUCTION GRADE === */}
        {/* Clean sections matching Snapchat/TikTok/Instagram reference design */}
        <SettingsSection title="Safety and Privacy">
          <SettingsRow icon={<ShieldIcon size={18} />} label="Accessibility" trailing={<ChevronRightIcon size={16} />} />
          <SettingsRow icon={<ContactsIcon size={18} />} label="Contacts and location" trailing={<ChevronRightIcon size={16} />} />
        </SettingsSection>

        <SettingsSection title="Cache && Cellular">
          <SettingsRow icon={<CloudDownloadIcon size={18} />} label="Offline videos" trailing={<ChevronRightIcon size={16} />} />
          <SettingsRow icon={<TrashIcon size={18} />} label="Free up space" trailing={<ChevronRightIcon size={16} />} />
          <SettingsRow icon={<DataSaverIcon size={18} />} label="Data Saver" trailing={<ChevronRightIcon size={16} />} />
        </SettingsSection>

        <SettingsSection title="Support && About">
          <SettingsRow icon={<HeadsetIcon size={18} />} label="Help Center" trailing={<ChevronRightIcon size={16} />} />
          <SettingsRow icon={<PrivacyIcon size={18} />} label="Privacy Center" trailing={<ChevronRightIcon size={16} />} />
          <SettingsRow icon={<InfoIcon size={18} />} label="Terms and Policies" trailing={<ChevronRightIcon size={16} />} />
        </SettingsSection>

        <SettingsSection title="Login">
          <SettingsRow icon={<SwitchIcon size={18} />} label="Switch account" trailing={<UserAvatar size={26} src={me.photo_urls?.[0] || ''} />} />
          <SettingsRow icon={<LogoutIcon size={18} />} label="Log out" trailing={<ChevronRightIcon size={16} />} onClick={onLogout} />
        </SettingsSection>

        {/* Footer */}
        <div style={{ padding: '30px 16px', textAlign: 'center', color: '#656770', fontSize: 12 }}>
          <div style={{ marginBottom: 4 }}>Campmatch v1.0.0</div>
          <div>Made with \u2764\ufe0f in Ghana</div>
        </div>
      </div>
    )
  }`;

    const newContent = content.slice(0, startIdx) + newSettings + content.slice(endBraceIdx);
    fs.writeFileSync('frontend/src/pages/ProfilePage.tsx', newContent);
    console.log('Replacement done successfully');
}
