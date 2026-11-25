path = 'C:/Users/user/Downloads/Telegram Desktop/campmatch-complete/frontend/src/pages/AuthPage.tsx'

with open(path, 'r') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Check for duplicate verifyAuth block
verify_count = 0
for i, line in enumerate(lines):
    if 'async function verifyAuth()' in line:
        print(f"Found verifyAuth definition at line {i+1}")
        verify_count += 1

if verify_count == 1:
    print("SUCCESS: Only one verifyAuth function found")
elif verify_count > 1:
    print(f"ERROR: Found {verify_count} verifyAuth functions - DUPLICATE EXISTS!")
else:
    print("WARNING: No verifyAuth function found")

# Check for duplicate screen init
count = 0
for i, line in enumerate(lines):
    if "const [authModalOpen, setAuthModalOpen] = useState(false)" in line:
        count += 1
        print(f"Found useState for authModalOpen at line {i+1}")

if count == 1:
    print("SUCCESS: Only one authModalOpen state variable found")
elif count > 1:
    print(f"ERROR: Found {count} authModalOpen state variables - DUPLICATE EXISTS!")

# Check if /api/register is still in the file
for i, line in enumerate(lines):
    if '/api/register' in line:
        print(f"WARNING: Found '/api/register' at line {i+1}")
        break
else:
    print("SUCCESS: No '/api/register' found in AuthPage.tsx")

print("\n--- Verification complete ---")