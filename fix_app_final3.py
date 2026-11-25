path = 'C:/Users/user/Downloads/Telegram Desktop/campmatch-complete/frontend/src/pages/AuthPage.tsx'

with open(path, 'r') as f:
    lines = f.readlines()

# Find line 306 (index 305): "        }" - closing the else block opened at line 281
start_idx = None
for i in range(305, len(lines)):
    if lines[i].rstrip() == '        }':
        start_idx = i
        break

if start_idx is None:
    print("Could not find line 306 '        }'")
    exit(1)

# Find end of verifyAuth function body: "    }" followed by "    verifyAuth()"
end_idx = None
for i in range(start_idx + 1, len(lines)):
    stripped = lines[i].rstrip()
    if stripped == '    }' and i + 1 < len(lines) and lines[i+1].strip() == 'verifyAuth()':
        end_idx = i
        break

if end_idx is None:
    print("Could not find end of verifyAuth function")
    exit(1)

print(f"Found duplicate block from line {start_idx+1} to line {end_idx+1}")

# Delete lines from start_idx to end_idx (inclusive)
new_lines = lines[:start_idx] + lines[end_idx+1:]

with open(path, 'w') as f:
    f.write('\n'.join(new_lines))

print(f"SUCCESS: Deleted lines {start_idx+1} to {end_idx+1} (duplicate verifyAuth block)")
print(f"File reduced from {len(lines)} to {len(new_lines)} lines")