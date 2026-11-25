path = 'C:/Users/user/Downloads/Telegram Desktop/campmatch-complete/frontend/src/App.tsx'

with open(path, 'r') as f:
    lines = f.readlines()

# Find line 306 (index 305): "        }" - closing the if (!r.ok) block at line 267
# But actually line 281 "        } else {" closes if (!r.ok) AND opens else block
# Line 306 "        }" closes the else block opened at line 281
# Lines 307-345 (indices 306-344) are duplicate verifyAuth body that needs deletion

start_idx = None
for i in range(305, len(lines)):
    stripped = lines[i].rstrip()
    if stripped == '        }':
        start_idx = i
        break

if start_idx is None:
    print("Could not find line 306 '        }'")
    for i in range(300, min(320, len(lines))):
        print(f"{i+1}: {repr(lines[i])}")
    exit(1)

# Find end of verifyAuth function body: "    }" followed by "    verifyAuth()"
end_idx = None
for i in range(start_idx, len(lines)):
    stripped = lines[i].rstrip()
    if stripped == '    }' and i + 1 < len(lines) and lines[i+1].strip() == 'verifyAuth()':
        end_idx = i
        break

if end_idx is None:
    print("Could not find end of verifyAuth function")
    for i in range(start_idx, min(start_idx+50, len(lines))):
        print(f"{i+1}: {repr(lines[i])}")
    exit(1)

print(f"Found duplicate block from line {start_idx+1} to line {end_idx+1}")

# Delete lines from start_idx to end_idx (inclusive)
new_lines = lines[:start_idx] + lines[end_idx+1:]

with open(path, 'w') as f:
    f.write('\n'.join(new_lines))

print(f"SUCCESS: Deleted lines {start_idx+1} to {end_idx+1} (duplicate verifyAuth block)")
print(f"File reduced from {len(lines)} to {len(new_lines)} lines")