# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\e2e\final-verification.spec.ts >> Campmatch - Final Verification >> DECK: shows seed users with photos
- Location: tests\e2e\final-verification.spec.ts:51:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.swipe-card, .deck-arena, .match-card')
Expected: visible
Error: strict mode violation: locator('.swipe-card, .deck-arena, .match-card') resolved to 2 elements:
    1) <div class="deck-arena">…</div> aka locator('div').filter({ hasText: 'Test User20UMaT · Level 200' }).nth(3)
    2) <div class="swipe-card top-card ">…</div> aka getByText('Test User20UMaT · Level 200 · CS82% Match')

Call log:
  - Expect "toBeVisible" locator('.swipe-card, .deck-arena, .match-card') with timeout 10000ms
  - waiting for locator('.swipe-card, .deck-arena, .match-card')

```

# Page snapshot

```yaml
- generic [ref=f2e3]:
  - complementary [ref=f2e4]:
    - generic [ref=f2e5]:
      - generic [ref=f2e7] [cursor=pointer]:
        - generic [ref=f2e8]: Deck Tester
        - generic [ref=f2e9]: UMaT
      - generic [ref=f2e10]:
        - button "Explore" [ref=f2e11] [cursor=pointer]
        - button "Switch Theme" [ref=f2e15] [cursor=pointer]
    - generic [ref=f2e22]:
      - button "Discover" [ref=f2e23] [cursor=pointer]
      - button "Explore" [ref=f2e24] [cursor=pointer]
      - button "Likes (0)" [ref=f2e25] [cursor=pointer]
    - generic [ref=f2e26]:
      - textbox "Search matches and messages..." [ref=f2e27]
      - generic [ref=f2e28]:
        - generic [ref=f2e29]: Match Queue (0)
        - generic [ref=f2e30]: 24h Window
      - generic [ref=f2e34]:
        - button "Likes You" [ref=f2e35]:
          - generic [ref=f2e36]: "0"
          - text: Likes
        - generic [ref=f2e40]: New mutual likes appear here.
      - generic [ref=f2e41]: Messages (0)
      - generic [ref=f2e42]: Select a match above to start a conversation.
  - main [ref=f2e43]:
    - generic [ref=f2e44]:
      - generic [ref=f2e46]:
        - generic [ref=f2e47]:
          - img "Test User" [ref=f2e48]
          - button "Previous photo" [ref=f2e49] [cursor=pointer]
          - button "Next photo" [ref=f2e52] [cursor=pointer]
        - generic [ref=f2e56]:
          - generic [ref=f2e57]:
            - generic [ref=f2e58]: Test User
            - generic [ref=f2e59]: "20"
          - generic [ref=f2e63]: UMaT · Level 200 · CS
        - generic [ref=f2e64]: 82% Match
        - button "Open full profile" [ref=f2e67] [cursor=pointer]
      - generic [ref=f2e70]:
        - button "Rewind unavailable" [disabled] [ref=f2e71]
        - button "Pass" [ref=f2e75] [cursor=pointer]
        - button "Like" [ref=f2e79] [cursor=pointer]
        - button "30-minute Campus Spotlight" [ref=f2e82] [cursor=pointer]
      - generic [ref=f2e85]:
        - generic [ref=f2e86]:
          - generic [ref=f2e87]: ←
          - text: Pass
        - generic [ref=f2e88]:
          - generic [ref=f2e89]: →
          - text: Like
        - generic [ref=f2e90]:
          - generic [ref=f2e91]: Space
          - text: Next Photo
        - generic [ref=f2e92]:
          - generic [ref=f2e93]: ↑
          - text: Open Card
  - generic [ref=f2e94]:
    - button "Chat on WhatsApp" [ref=f2e95] [cursor=pointer]
    - button "Open Campmatch assistant" [ref=f2e98] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | test.describe('Campmatch - Final Verification', () => {
  4   | 
  5   |   test.beforeEach(async ({ page }) => {
  6   |     await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 })
  7   |     await page.waitForTimeout(2000)
  8   |   })
  9   | 
  10  |   test('LANDING: specific Ghana campus copy, no AI slop', async ({ page }) => {
  11  |     await expect(page.locator('text=Verified student matching for Ghana campuses')).toBeVisible()
  12  |     await expect(page.locator('text=UG Legon, KNUST, UCC, UMaT, UEW, UDS, Ashesi')).toBeVisible()
  13  |     // No eyebrow/kicker above headings
  14  |     await expect(page.locator('.eyebrow')).toHaveCount(0)
  15  |     // No section numbers
  16  |     await expect(page.locator('.connect-item-number')).toHaveCount(0)
  17  |     await expect(page.locator('.verify-step-number')).toHaveCount(0)
  18  |   })
  19  | 
  20  |   test('AUTH: modal opens and domain validation works', async ({ page }) => {
  21  |     const createBtn = page.locator('button:has-text("Create account"), button:has-text("Join Campmatch Today")').first()
  22  |     if (await createBtn.isVisible({ timeout: 5000 })) {
  23  |       await createBtn.click()
  24  |       await page.waitForTimeout(2000)
  25  |       const modal = page.locator('.auth-modal-backdrop, .auth-modal-body')
  26  |       await expect(modal.first()).toBeVisible()
  27  |       
  28  |       // Test domain validation
  29  |       await page.fill('input[name="email"]', 'test@gmail.com')
  30  |       await page.fill('input[name="password"]', 'Test1234!')
  31  |       await page.click('button[type="submit"]')
  32  |       await expect(page.locator('text=Personal Gmail and non-school accounts are not allowed')).toBeVisible({ timeout: 5000 })
  33  |     }
  34  |   })
  35  | 
  36  |   test('PROFILE: page loads and View My Card button works', async ({ page }) => {
  37  |     await page.goto('http://localhost:5173/profile', { waitUntil: 'domcontentloaded', timeout: 15000 })
  38  |     await page.waitForTimeout(3000)
  39  |     await expect(page.locator('body')).toBeVisible()
  40  |     
  41  |     // View My Card button should be visible
  42  |     const viewCardBtn = page.locator('button:has-text("View Card")')
  43  |     if (await viewCardBtn.isVisible({ timeout: 5000 })) {
  44  |       await viewCardBtn.click()
  45  |       await page.waitForTimeout(2000)
  46  |       // ProfileCardView should be rendered
  47  |       await expect(page.locator('text=Your Card')).toBeVisible({ timeout: 5000 })
  48  |     }
  49  |   })
  50  | 
  51  |   test('DECK: shows seed users with photos', async ({ page, context }) => {
  52  |     // Create a user with complete profile via API
  53  |     const email = 'decktest' + Date.now() + '@st.umat.edu.gh'
  54  |     await context.request.post('http://localhost:8000/api/signup', {
  55  |       data: { email: email, password: 'Test1234!' }
  56  |     })
  57  |     const loginRes = await context.request.post('http://localhost:8000/api/login', {
  58  |       data: { email: email, password: 'Test1234!' }
  59  |     })
  60  |     const token = (await loginRes.json()).access_token
  61  |     
  62  |     // Update profile
  63  |     await context.request.post('http://localhost:8000/api/profile', {
  64  |       headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  65  |       data: {
  66  |         name: 'Deck Tester', level: '200', age: 20, course: 'CS', gender: 'female',
  67  |         interested_in: 'male', bio: 'Test user', min_age: 18, max_age: 30,
  68  |         preferred_levels: '', show_me: 'everyone', max_distance_km: 50,
  69  |         verified_only: false, snoozed: false, mode: 'date',
  70  |         looking_for: 'Long-term partner', interests: [], explore_vibes: [],
  71  |         prompts: [], opening_move: 'Hi!', hall: '', zodiac: '',
  72  |         height: '', spotify_anthem: '',
  73  |         photo_urls: ['https://example.com/photo.webp']
  74  |       }
  75  |     })
  76  |     
  77  |     // Now test deck via frontend
  78  |     await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 })
  79  |     await page.waitForTimeout(3000)
  80  |     // Set token via localStorage
  81  |     await page.evaluate((token) => {
  82  |       localStorage.setItem('token', token)
  83  |     }, token)
  84  |     await page.reload()
  85  |     await page.waitForTimeout(3000)
  86  |     
  87  |     // Deck should show seed users
> 88  |     await expect(page.locator('.swipe-card, .deck-arena, .match-card')).toBeVisible({ timeout: 10000 })
      |                                                                         ^ Error: expect(locator).toBeVisible() failed
  89  |   })
  90  | 
  91  |   test('SETTINGS: discovery modal opens and saves', async ({ page }) => {
  92  |     await page.goto('http://localhost:5173/profile', { waitUntil: 'domcontentloaded', timeout: 15000 })
  93  |     await page.waitForTimeout(3000)
  94  |     
  95  |     const discoveryBtn = page.locator('button:has-text("Discovery preferences")')
  96  |     if (await discoveryBtn.isVisible({ timeout: 5000 })) {
  97  |       await discoveryBtn.click()
  98  |       await page.waitForTimeout(2000)
  99  |       await expect(page.locator('text=Discovery Preferences')).toBeVisible({ timeout: 5000 })
  100 |       
  101 |       // Change max distance and save
  102 |       await page.waitForSelector('.sheet-backdrop', { state: 'visible', timeout: 5000 })
  103 |       await page.click('button:has-text("Save Preferences")')
  104 |       await page.waitForTimeout(2000)
  105 |     }
  106 |   })
  107 | 
  108 |   test('API: all endpoints return 200', async ({ page, context }) => {
  109 |     const email = 'apitest' + Date.now() + '@st.umat.edu.gh'
  110 |     const signup = await context.request.post('http://localhost:8000/api/signup', {
  111 |       data: { email: email, password: 'Test1234!' }
  112 |     })
  113 |     expect(signup.ok()).toBe(true)
  114 |     
  115 |     const login = await context.request.post('http://localhost:8000/api/login', {
  116 |       data: { email: email, password: 'Test1234!' }
  117 |     })
  118 |     expect(login.ok()).toBe(true)
  119 |     
  120 |     const token = (await login.json()).access_token
  121 |     
  122 |     const me = await context.request.get('http://localhost:8000/api/me', {
  123 |       headers: { Authorization: 'Bearer ' + token }
  124 |     })
  125 |     expect(me.ok()).toBe(true)
  126 |     
  127 |     const plus = await context.request.get('http://localhost:8000/api/plus-status', {
  128 |       headers: { Authorization: 'Bearer ' + token }
  129 |     })
  130 |     expect(plus.ok()).toBe(true)
  131 |     
  132 |     const channels = await context.request.get('http://localhost:8000/api/payments/config', {
  133 |       headers: { Authorization: 'Bearer ' + token }
  134 |     })
  135 |     expect(channels.ok()).toBe(true)
  136 |     
  137 |     const explore = await context.request.get('http://localhost:8000/api/explore/rooms', {
  138 |       headers: { Authorization: 'Bearer ' + token }
  139 |     })
  140 |     expect(explore.ok()).toBe(true)
  141 |     
  142 |     const notifications = await context.request.get('http://localhost:8000/api/notifications', {
  143 |       headers: { Authorization: 'Bearer ' + token }
  144 |     })
  145 |     expect(notifications.ok()).toBe(true)
  146 |     
  147 |     console.log('All API endpoints: 200 OK')
  148 |   })
  149 | })
  150 | 
```