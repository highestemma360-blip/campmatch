import urllib.request
import json
import time

BASE = 'http://127.0.0.1:8080'

def post(path, body, token=None, headers=None):
    data = json.dumps(body).encode() if body else None
    h = {'Content-Type': 'application/json'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    if headers:
        h.update(headers)
    req = urllib.request.Request(f'{BASE}{path}', data=data, headers=h, method='POST')
    try:
        r = urllib.request.urlopen(req, timeout=10)
        return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def get(path, token=None):
    req = urllib.request.Request(f'{BASE}{path}', method='GET')
    if token:
        req.add_header('Authorization', 'Bearer ' + token)
    try:
        r = urllib.request.urlopen(req, timeout=10)
        return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

print("=" * 60)
print("TEST 1: Login with access + refresh tokens")
print("=" * 60)
code, body = post('/api/login', {'email': 'kwame@st.umat.edu.gh', 'password': 'Password123!'})
print(f'Status: {code}')
try:
    d = json.loads(body)
    access_token = d.get('access_token', '')
    refresh_token = d.get('refresh_token', '')
    print(f'access_token: {access_token[:40]}...')
    print(f'refresh_token: {refresh_token[:40]}...')
    print(f'expires_in: {d.get("expires_in")}')
except:
    print(body[:200])
    access_token = ''
    refresh_token = ''

print()
print("=" * 60)
print("TEST 2: Use access token for API calls")
print("=" * 60)
code, body = get('/api/deck?mode=date', access_token)
print(f'Deck status: {code}')
print(f'Body: {body[:200]}')

print()
print("=" * 60)
print("TEST 3: Refresh token to get new access token")
print("=" * 60)
code, body = post('/api/refresh', {'refresh_token': refresh_token})
print(f'Refresh status: {code}')
try:
    d = json.loads(body)
    new_access = d.get('access_token', '')
    new_refresh = d.get('refresh_token', '')
    print(f'New access_token: {new_access[:40]}...')
    print(f'New refresh_token: {new_refresh[:40]}...')
    # Use new access token
    code2, body2 = get('/api/deck?mode=date', new_access)
    print(f'Deck with new token: {code2}')
except:
    print(body[:200])

print()
print("=" * 60)
print("TEST 4: Logout invalidates session server-side")
print("=" * 60)
code, body = post('/api/logout', {'refresh_token': refresh_token}, token=access_token)
print(f'Logout status: {code}')
print(f'Body: {body[:200]}')

# Try using the old access token after logout (should fail since token_version bumped)
code2, body2 = get('/api/deck?mode=date', access_token)
print(f'Deck after logout (old token): {code2} - {body2[:100]}')

# Try using old refresh token (should fail)
code3, body3 = post('/api/refresh', {'refresh_token': refresh_token})
print(f'Refresh with old token: {code3} - {body3[:100]}')

print()
print("=" * 60)
print("TEST 5: Password change logs out all devices")
print("=" * 60)
# Login again
code, body = post('/api/login', {'email': 'kwame@st.umat.edu.gh', 'password': 'Password123!'})
d = json.loads(body)
access2 = d.get('access_token', '')
refresh2 = d.get('refresh_token', '')

# Change password
code, body = post('/api/account/password', {'current_password': 'Password123!', 'new_password': 'Password123!'}, token=access2)
print(f'Password change: {code}')
try:
    d2 = json.loads(body)
    print(f'Message: {d2.get("message", "")}')
except:
    print(body[:200])

# Try old access token after password change (should fail)
code2, body2 = get('/api/deck?mode=date', access2)
print(f'Deck with old token after pw change: {code2} - {body2[:100]}')

# Try old refresh token (should fail)
code3, body3 = post('/api/refresh', {'refresh_token': refresh2})
print(f'Refresh with old token after pw change: {code3} - {body3[:100]}')

# Login with new password
code, body = post('/api/login', {'email': 'kwame@st.umat.edu.gh', 'password': 'Password123!'})
print(f'Login with same password (new session): {code}')

print()
print("=" * 60)
print("TEST 6: Create Story (free user - 24h only)")
print("=" * 60)
code, body = post('/api/login', {'email': 'kwame@st.umat.edu.gh', 'password': 'Password123!'})
d = json.loads(body)
tok = d.get('access_token', '')

# Try 6h (should fail for free user)
code, body = post('/api/stories', {'media_url': 'https://example.com/story1.jpg', 'media_type': 'image', 'caption': 'My story', 'duration_hours': 6}, token=tok)
print(f'Create 6h story (free user): {code} - {body[:150]}')

# Try 24h (should succeed)
code, body = post('/api/stories', {'media_url': 'https://example.com/story1.jpg', 'media_type': 'image', 'caption': 'My 24h story', 'duration_hours': 24}, token=tok)
print(f'Create 24h story: {code} - {body[:200]}')

print()
print("=" * 60)
print("TEST 7: Get stories feed")
print("=" * 60)
code, body = get('/api/stories/feed', tok)
print(f'Stories feed: {code} - {body[:300]}')

print()
print("=" * 60)
print("TEST 8: View a story")
print("=" * 60)
# Get my stories to get an ID
code, body = get('/api/stories/my', tok)
print(f'My stories: {code} - {body[:300]}')
try:
    stories = json.loads(body)
    if stories:
        sid = stories[0]['id']
        code2, body2 = post(f'/api/stories/{sid}/view', {}, token=tok)
        print(f'View story {sid}: {code2} - {body2[:100]}')
except:
    pass

print()
print("=" * 60)
print("ALL TESTS COMPLETE")
print("=" * 60)
