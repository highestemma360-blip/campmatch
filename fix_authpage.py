import re

path = 'C:/Users/user/Downloads/Telegram Desktop/campmatch-complete/frontend/src/pages/AuthPage.tsx'

with open(path, 'r') as f:
    content = f.read()

# Find the duplicate verifyAuth function and replace the whole thing
old = '''  useEffect(() => {
    let active = true

    async function verifyAuth() {
      if (!token) {
        setAuthLoading(false)
        setAuthError(null)
        return
      }
      // Only show loading spinner on initial page load (stored token), not after fresh login
      if (!justAuthRef.current) {
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
            if (!justAuthRef.current) {
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
          if (active && justAuthRef.current) {
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
        } else {
          // Successful auth verification — populate user state
          if (active && justAuthRef.current) {
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
        } else {
          // Successful auth verification — populate user state
          if (active && justAuthRef.current) {'''

new = '''  useEffect(() => {
    let active = true

    async function verifyAuth() {
      if (!token) {
        setAuthLoading(false)
        setAuthError(null)
        return
      }
      // Only show loading spinner on initial page load (stored token), not after fresh login
      if (!justAuthRef.current) {
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
            if (!justAuthRef.current) {
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
          if (active && justAuthRef.current) {
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
          if (!justAuthRef.current) {
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

if old in content:
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print("SUCCESS: Fixed verifyAuth function in AuthPage.tsx")
else:
    print("ERROR: Could not find verifyAuth function pattern")
    # Debug: show lines around 267-310
    lines = content.split('\n')
    for i in range(265, min(320, len(lines))):
        print(f"{i+1}: {lines[i]}")