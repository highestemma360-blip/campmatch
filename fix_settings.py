import re

with open('frontend/src/pages/ProfilePage.tsx', 'r') as f:
    content = f.read()

# Find the start and end of the settings section to replace
start_marker = '        {/* === ACCOUNT === */}'
end_marker = '  }\n\n  // ---'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx == -1:
    print('START MARKER NOT FOUND')
elif end_idx == -1:
    print('END MARKER NOT FOUND')
else:
    # Find the closing of the settings screen return
    end_brace_idx = content.rfind('  }\n\n  // ---', start_idx, end_idx)
    print(f'Start: {start_idx}, End brace: {end_brace_idx}, End: {end_idx}')
    
    new_settings = '''        {/* === SETTINGS - PRODUCTION GRADE === */}
        {/* Clean sections matching Snapchat/TikTok/Instagram reference design */}
        <SettingsSection title="Safety and Privacy">
          <SettingsRow icon={<ShieldIcon size={18} />} label="Accessibility" trailing={<ChevronRightIcon size={16} />} />
          <SettingsRow icon={<ContactsIcon size={18} />} label="Contacts and location" trailing={<ChevronRightIcon size={16} />} />
        </SettingsSection>

        <SettingsSection title="Cache &amp; Cellular">
          <SettingsRow icon={<CloudDownloadIcon size={18} />} label="Offline videos" trailing={<ChevronRightIcon size={16} />} />
          <SettingsRow icon={<TrashIcon size={18} />} label="Free up space" trailing={<ChevronRightIcon size={16} />} />
          <SettingsRow icon={<DataSaverIcon size={18} />} label="Data Saver" trailing={<ChevronRightIcon size={16} />} />
        </SettingsSection>

        <SettingsSection title="Support &amp; About">
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
  }'''

    new_content = content[:start_idx] + new_settings + content[end_brace_idx:]
    
    with open('frontend/src/pages/ProfilePage.tsx', 'w') as f:
        f.write(new_content)
    
    print('Replacement done successfully')
