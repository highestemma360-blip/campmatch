import urllib.request
import json

BASE = 'http://127.0.0.1:8080'

def post(path, body, token=None):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(f'{BASE}{path}', data=data, headers={'Content-Type': 'application/json'}, method='POST')
    if token:
        req.add_header('Authorization', 'Bearer ' + token)
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

# 1. Login correct
code, body = post('/api/login', {'email': 'kwame@st.umat.edu.gh', 'password': 'Password123!'})
print('1. Login correct:', code)
print('   Body:', body[:200])
token = None
try:
    token = json.loads(body).get('token', '')
except:
    pass

# 2. Wrong password 6 times
for i in range(6):
    code, body = post('/api/login', {'email': 'kwame@st.umat.edu.gh', 'password': 'WrongPassword1!'})
    print('2. Wrong attempt %d: %s - %s' % (i+1, code, body[:80]))

# 3. Login while locked
code, body = post('/api/login', {'email': 'kwame@st.umat.edu.gh', 'password': 'Password123!'})
print('3. Locked login:', code, '-', body[:100])

# 4. Admin login
code, body = post('/api/login', {'email': 'admin@st.umat.edu.gh', 'password': 'AdminPass123!'})
print('4. Admin login:', code)
print('   Body:', body[:200])
admin_token = None
try:
    admin_token = json.loads(body).get('token', '')
except:
    pass

# 5. Deck
code, body = get('/api/deck?mode=date', admin_token)
print('5. Deck:', code, '-', body[:100])

# 6. Boost
code, body = post('/api/boost', {}, admin_token)
print('6. Boost:', code, '-', body[:100])

# 7. Health
code, body = get('/api/health')
print('7. Health:', code, '-', body[:200])

# 8. Auth config
code, body = get('/api/auth-config')
print('8. Auth config:', code, '-', body[:200])
