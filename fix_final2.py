path = "C:/Users/user/Downloads/Telegram Desktop/campmatch-complete/frontend/src/pages/AuthPage.tsx"

with open(path, 'r') as f:
    lines = f.readlines()

# Find line 306 (index 305): "        }" - closing the if (!r.ok) block
# We need to find where verifyAuth function starts and ends properly
# Looking at the output, line 306 is "        }" which closes if (!r.ok)
# Line 307 starts "            try {" which is part of the duplicate code
# The actual verifyAuth function should END at line 306 with "        }"
# But there's duplicate code after it

# Find where verifyAuth function STARTS
start_idx = None
for i in range(len(lines)):
    if 'async function verifyAuth()' in lines[i]:
        start_idx = i
        print(f"Found verifyAuth start at line {i+1}")
        break

# Find where verifyAuth function ENDS properly - look for the matching closing brace
# Count braces from start_idx
brace_count = 0
verify_start = None
verify_end = None
for i in range(start_idx, len(lines)):
    stripped = lines[i].strip()
    if 'async function verifyAuth()' in stripped:
        verify_start = i
        brace_count = 1
        continue
    if verify_start is not None:
        if '{' in stripped:
            brace_count += stripped.count('{')
        if '}' in stripped:
            brace_count -= stripped.count('}')
        if brace_count == 0:
            end_idx = i
            break

if end_idx is None:
    print("Could not find end of verifyAuth function")
    exit(1)

print(f"verifyAuth starts at line {start_idx+1}, ends at line {end_idx+1}")

# Print lines around end_idx to verify
print(f"\nLines around end_idx ({end_idx}):")
for i in range(end_idx-3, min(end_idx+3, len(lines))):
    print(f"{i+1}: {repr(lines[i])}")