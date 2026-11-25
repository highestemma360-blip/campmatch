path = 'C:/Users/user/Downloads/Telegram Desktop/campmatch-complete/frontend/src/pages/AuthPage.tsx'

with open(path, 'r') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
print(f"\nLines 300-310:")
for i in range(299, min(315, len(lines))):
    print(f"{i+1}: {repr(lines[i])}")

# Find line 306 (index 305): "        } else {"
start_idx = None
for i in range(305, len(lines)):
    stripped = lines[i].rstrip()
    print(f"Line {i+1}: stripped={repr(stripped)}")
    if stripped == '        } else {':
        start_idx = i
        print(f"  -> FOUND '        } else {{' at line {i+1}")
        break

if start_idx is None:
    print("\nCould not find '        } else {' starting from line 306")
else:
    print(f"\nFound '        } else {' at line {start_idx+1}")