import re

path = 'C:/Users/user/Downloads/Telegram Desktop/campmatch-complete/frontend/src/pages/AuthPage.tsx'

with open(path, 'r') as f:
    content = f.read()

# Find the verifyAuth function and replace the entire thing
old_pattern = r'''  useEffect\(\(\) => {
    let active = true

    async function verifyAuth\(\) {
      if \(!token\) {
        setAuthLoading\(false\)
        setAuthError\(null\)
        return
      }
      // Only show loading spinner on initial page load \(stored token\), not after fresh login
      if \(!justAuthedRef\.current\) {
        setAuthLoading\(true\)
      }
      setAuthError\(null\)
      try {
        const r = await fetch\('/api/me', \{
          headers: \{ Authorization: 'Bearer ' \+ token \},
          credentials: 'include',
        \}\)
        if \(!r\.ok\) \{
          if \(active\) \{
            // If we just authenticated via onAuth, the token IS valid - don't clear it
            if \(!justAuthedRef\.current\) \{
              setAuthError\('Session expired\. Please sign in again\.'\)
              setToken\(''\)
              localStorage\.removeItem\('token'\)
              localStorage\.removeItem\('refresh_token'\)
              onTokenUpdatedRef\.current\?.\(\)\'
            \} else \{
              // Just logged in - /api/me may be temporarily slow, don't fall back
              setAuthError\(null\)
            }
          }
        \} else \{
          // Successful auth verification — populate user state
          if \(active \&\& justAuthedRef\.current\) \{
            try \{
              const u = await r\.json\(\)
              setMe\(u\)
              setExploreOptedIn\(u\.explore_vibes \|\| \[\]\)
              if \(u\.swipe_quota\) setQuota\(u\.swipe_quota\)
              setMode\(u\.mode as AppMode \|\| 'date'\)
              if \(u\.photo_required && \(!u\.photo_urls \|\| u\.photo_urls\.length === 0\)\) \{
                setPhotoRequired\(true\)
              }
              if \(!u\.profile_complete\) \{
                setNeedsSetup\(true\)
              \} else \{
                setNeedsSetup\(false\)
                loadDeck\(activeVibe\?.id, \(u\.mode as AppMode\) \|\| 'date'\)
                loadMatches\(\)
                loadLikesYou\(\)
                loadExploreCounts\(\)
              \}
            \} catch \{
              // If parsing fails, fall through — token is still valid
            }
          }
        \} else \{
          // Successful auth verification — populate user state
          if \(active \&\& justAuthedRef\.current\) \{
            try \{
              const u = await r\.json\(\)
              setMe\(u\)
              setExploreOptedIn\(u\.explore_vibes \|\| \[\]\)
              if \(u\.swipe_quota\) setQuota\(u\.swipe_quota\)
              setMode\(u\.mode as AppMode \|\| 'date'\)
              if \(u\.photo_required && \(!u\.photo_urls \|\| u\.photo_urls\.length === 0\)\) \{
                setPhotoRequired\(true\)
              }
              if \(!u\.profile_complete\) \{
                setNeedsSetup\(true\)
              \} else \{
                setNeedsSetup\(false\)
                loadDeck\(activeVibe\?.id, \(u\.mode as AppMode\) \|\| 'date'\)
                loadMatches\(\)
                loadLikesYou\(\)
                loadExploreCounts\(\)
              \}
            \} catch \{
              // If parsing fails, fall through — token is still valid
            }
          }
        \}
      \} catch \{
        if \(active\) \{
          if \(!justAuthedRef\.current\) \{
            setAuthError\('Unable to verify session\. Please sign in again\.'\)
            setToken\(''\)
            localStorage\.removeItem\('token'\)
            localStorage\.removeItem\('refresh_token'\)
            onTokenUpdatedRef\.current\?.\(\)\'
          \} else \{
            setAuthError\(null\)
          \}
        \}
      \} finally \{
        if \(active\) setAuthLoading\(false\)
      }
    \}

    verifyAuth\(\)
    return \(\) => \{
      active = false
    \}
  \], \[token\]\)
'''

new_verify_auth = '''  useEffect(() => {
    let active = true

    async function verifyAuth() {
      if (!token) {
        setAuthLoading(false)
        setAuthError(null)
        return
      }
      // Only show loading spinner on initial page load (stored token), not after fresh login
      if (!justAuthedRef.current) {
        setAuthLoading(true)
      }
      setAuthError(null)
      try {
        const r = await fetch('/api/me', {
          headers: { Authorization: 'Bearer ' + token },
          credentials: 'include',
        })
        if (!r.ok) {
          if (active) {
            // If we just authenticated via onAuth, the token IS valid - don't clear it
            if (!justAuthedRef.current) {
              setAuthError('Session expired. Please sign in again.')
              setToken('')
              localStorage.removeItem('token')
              localStorage.removeItem('refresh_token')
              onTokenUpdatedRef.current?.('')
            } else {
              // Just logged in - /api/me may be temporarily slow, don't fall back
              setAuthError(null)
            }
          }
        } else {
          // Successful auth verification — populate user state
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
          if (!justAuthedRef.current) {
            setAuthError('Unable to verify session. Please sign in again.')
            setToken('')
            localStorage.removeItem('token')
            localStorage.removeItem('refresh_token')
            onTokenUpdatedRef.current?.('')
          } else {
            setAuthError(null)
          }
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

if old_pattern in content:
    content = content.replace(old_pattern, new_verify_auth)
    with open(path, 'w') as f:
        f.write(content)
    print("SUCCESS: Fixed verifyAuth function")
else:
    print("ERROR: Could not find verifyAuth function pattern")
    # Debug: show what's around line 267
    lines = content.split('\\n')
    for i, line in enumerate(lines[265:275], start=266):
        print(f"{i}: {line}")