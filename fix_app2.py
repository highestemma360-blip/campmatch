import re

path = 'C:/Users/user/Downloads/Telegram Desktop/campmatch-complete/frontend/src/App.tsx'

with open(path, 'r') as f:
    content = f.read()

lines = content.split('\n')

# Find the verifyAuth function start: "  useEffect(() => {" around line 248
start_idx = None
for i in range(240, len(lines)):
    if 'useEffect(() => {' in lines[i] and i > 0:
        # Check this is the verifyAuth effect (not another useEffect)
        found = False
        for j in range(i, min(i+50, len(lines))):
            if 'verifyAuth()' in lines[j]:
                found = True
                break
        if found:
            start_idx = i
            break

if start_idx is None:
    print("Could not find verifyAuth function start")
    for i, line in enumerate(lines):
        if 'verifyAuth' in line:
            print(f"  Line {i+1}: {line.strip()}")
    exit(1)

# Find the end - look for "    }" followed by "    verifyAuth()" at the same indent level
end_idx = None
for i in range(start_idx, len(lines)):
    stripped = lines[i].rstrip()
    if stripped == '    }' and i + 1 < len(lines) and lines[i+1].strip() == 'verifyAuth()':
        end_idx = i
        break

if end_idx is None:
    print("Could not find end of verifyAuth function")
    for i in range(start_idx, min(start_idx+100, len(lines))):
        print(f"{i+1}: {lines[i]}")
    exit(1)

print(f"Found verifyAuth function from line {start_idx+1} to line {end_idx+1}")

new_verify_auth = '''  useEffect(() => {
    let active = true

    async function verifyAuth() {
      if (!token) {
        setAuthLoading(false)
        setAuthError(null)
        return
      }
      setAuthLoading(true)
      setAuthError(null)
      try {
        const r = await fetch('/api/me', {
          headers: { Authorization: 'Bearer ' + token },
          credentials: 'include',
        })
        if (!r.ok) {
          if (active) {
            if (!justAuthedRef.current) {
              setAuthError('Session expired. Please sign in again.')
              setToken('')
              localStorage.removeItem('token')
              localStorage.removeItem('refresh_token')
              onTokenUpdatedRef.current?.('')
            } else {
              setAuthError(null)
            }
          }
        } else {
          if (active && justAuthedRef.current) {
            try {
              const u = await r.json()
              setMe(u)
              setExploreOptedIn(u.explore_vibes || [])
              if (u.swipe_quota) setQuota(u.swipe_quota)
              setMode((u.mode as AppMode) || 'date')
              if (u.photo_required && (!u.photo_urls || u.photo_urls.length === 0)) {
                setPhotoRequired(true)
              }
              if (!u.profile_complete) {
                setNeedsSetup(true)
              } else {
                setNeedsSetup(false)
                loadDeck(activeVibe?.id, (u.mode as AppMode) || 'date')
                loadMatches()
                loadLikesYou()
                loadExploreCounts()
              }
            } catch {
              // If parsing fails, fall through — token is still valid
            }
          }
        }
      } catch {
        if (active) {
          setAuthError('Unable to verify session. Please sign in again.')
          setToken('')
          localStorage.removeItem('token')
          localStorage.removeItem('refresh_token')
          onTokenUpdatedRef.current?.('')
        }
      } finally {
        if (active) setAuthLoading(false)
      }
    }

    verifyAuth()
    return () => {
      active = false
    }
  }, [token])'''

content = content[:start_idx] + new_verify_auth + content[end_idx+1:]

with open(path, 'w') as f:
    f.write(content)

print(f"SUCCESS: Replaced verifyAuth function (lines {start_idx+1} to {end_idx+1})")