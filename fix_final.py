path = 'C:/Users/user/Downloads/Telegram Desktop/campmatch-complete/frontend/src/pages/AuthPage.tsx'

with open(path, 'r') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
print(f"Line 305: {repr(lines[304])}")
print(f"Line 306: {repr(lines[305])}")
print(f"Line 307: {repr(lines[306])}")

# Lines 305-345 (indices 304-344) are the duplicate code
# Line 305: "          }" - closes if (active) at line 268 (already closed at line 277)
# Line 306: "        }" - closes if (!r.ok) at line 267 (already closed at line 278)
# Lines 307-345: Duplicate verifyAuth body

start_idx = 304  # line 305
end_idx = 344    # line 345

print(f"Deleting lines {start_idx+1} to {end_idx+1}")

new_lines = lines[:start_idx] + lines[end_idx+1:]

with open(path, 'w') as f:
    f.write('\n'.join(new_lines))

print(f"SUCCESS: Deleted lines {start_idx+1} to {end_idx+1}")