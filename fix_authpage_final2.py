path = 'C:/Users/user/Downloads/Telegram Desktop/campmatch-complete/frontend/src/pages/AuthPage.tsx'

with open(path, 'r') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
print(f"Line 305: {repr(lines[304])}")
print(f"Line 306: {repr(lines[305])}")
print(f"Line 307: {repr(lines[306])}")

# Find where the verifyAuth function actually starts
# It should start around line 267 with "useEffect(() => {"
start_idx = None
for i in range(260, len(lines)):
    stripped = lines[i].rstrip()
    if stripped == 'useEffect(() => {' or stripped == 'useEffect(() => {' or 'useEffect(() => {' in stripped:
        # Check if this is verifyAuth by looking ahead
        for j in range(i+1, min(i+10, len(lines))):
            if 'verifyAuth' in lines[j]:
                start_idx = i
                print(f"Found verifyAuth useEffect at line {i+1}")
                break
        if start_idx:
            break

if start_idx is None:
    print("Could not find verifyAuth function start")
    exit(1)

# Find where verifyAuth function ends (the closing })
end_idx = None
brace_count = 0
found_start = False
for i in range(start_idx, len(lines)):
    stripped = lines[i].strip()
    if stripped.startswith('async function verifyAuth()'):
        found_start = True
        continue
    if found_start:
        # Count braces to find matching closing brace
        stripped = lines[i].strip()
        if stripped == '{':
            brace_count += 1
        elif stripped == '}':
            brace_count -= 1
            if brace_count == 0:
                end_idx = i
                break

print(f"verifyAuth function starts at line {start_idx+1}, ends at line {end_idx+1}")

# Print lines around end_idx to verify
for i in range(end_idx-2, min(end_idx+5, len(lines))):
    print(f"{i+1}: {repr(lines[i])}")