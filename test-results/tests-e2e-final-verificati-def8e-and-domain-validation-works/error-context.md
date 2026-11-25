# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\e2e\final-verification.spec.ts >> Campmatch - Final Verification >> AUTH: modal opens and domain validation works
- Location: tests\e2e\final-verification.spec.ts:20:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="email"]')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]: Campmatch
    - generic [ref=e10]:
      - heading "Meet students on your campus." [level=1] [ref=e11]
      - paragraph [ref=e12]: Verified university students at UG Legon, KNUST, UCC, UMaT, UEW, UDS, and technical colleges across Ghana. Sign in with your .edu.gh email to match with students in your hall, faculty, and Explore rooms.
      - generic [ref=e13]:
        - button "Create account" [active] [ref=e14] [cursor=pointer]
        - button "Sign in" [ref=e15] [cursor=pointer]
      - button "Browse Explore rooms →" [ref=e16]
  - generic [ref=e18]:
    - heading "Match with students in your hall and faculty." [level=2] [ref=e19]
    - paragraph [ref=e20]: Opt into Explore rooms for your vibe, swipe through verified students, and chat only after you match. No outsiders, no fake profiles.
    - generic [ref=e21]:
      - generic [ref=e22]:
        - heading "Sign in with .edu.gh" [level=3] [ref=e23]
        - paragraph [ref=e24]: Register with your institutional email (student@st.umat.edu.gh, name@ug.edu.gh). Your profile is tied to your university domain.
      - generic [ref=e25]:
        - heading "Opt into Explore rooms" [level=3] [ref=e26]
        - paragraph [ref=e27]: Choose rooms like Study Buddy, Food Date, Long Term, Night Stand, Walk Around, or Escort Tonight. Your card appears only in rooms you join.
      - generic [ref=e28]:
        - heading "Match and chat" [level=3] [ref=e29]
        - paragraph [ref=e30]: Swipe through verified students in your rooms. When you both like, the chat opens — no unsolicited DMs, no outsiders.
  - generic [ref=e32]:
    - heading "Every profile is tied to a real .edu.gh email." [level=2] [ref=e33]
    - paragraph [ref=e34]: Campmatch is built for Ghana university students. We verify your institutional email domain and screen profile photos so every card you swipe is a real student — not a bot, not a scammer.
    - generic [ref=e35]:
      - generic [ref=e37]:
        - heading "Enter your university email" [level=3] [ref=e38]
        - paragraph [ref=e39]: Sign up with your institutional .edu.gh email (e.g., student@st.umat.edu.gh, name@ug.edu.gh). Personal Gmail, Yahoo, and Outlook addresses are not accepted.
      - generic [ref=e41]:
        - heading "Verify your email" [level=3] [ref=e42]
        - paragraph [ref=e43]: Enter the confirmation code sent to your university inbox to unlock your verified student badge.
      - generic [ref=e45]:
        - heading "Upload a real photo" [level=3] [ref=e46]
        - paragraph [ref=e47]: Your profile photo is screened automatically — blank, black, blurry, or explicit images are rejected before they're saved.
      - generic [ref=e49]:
        - heading "Choose your intent and connect" [level=3] [ref=e50]
        - paragraph [ref=e51]: Select Dating, Friends, or Study. Set campus filters and start matching mutually with verified students in your Explore rooms.
  - generic [ref=e53]:
    - heading "Built for universities across Ghana." [level=2] [ref=e54]
    - paragraph [ref=e55]: We support institutional .edu.gh domains from universities and technical colleges nationwide. If your domain isn't listed, request it and we'll add it.
    - generic [ref=e56]: UG LegonKNUSTUCCUMaTAshesiUEWUDSGIMPAUPSATechnical Universities
    - generic [ref=e57]: Don’t see your .edu.gh domain? Request your campus.
  - generic [ref=e59]:
    - heading "No outsiders. No unsolicited DMs." [level=2] [ref=e60]
    - paragraph [ref=e61]: Every feature is designed around the university student experience — from verification to visibility controls.
    - generic [ref=e62]:
      - generic [ref=e64]:
        - heading "Institutional .edu.gh verification" [level=3] [ref=e65]
        - paragraph [ref=e66]: Every profile is tied to an active university email domain — no outsiders, no fake accounts.
      - generic [ref=e68]:
        - heading "Double opt-in chat" [level=3] [ref=e69]
        - paragraph [ref=e70]: No unsolicited DMs — messaging only opens when both students match.
      - generic [ref=e72]:
        - heading "Visibility & controls" [level=3] [ref=e73]
        - paragraph [ref=e74]: Filter who sees you by campus or mode, block or report anyone anytime, and opt out of Explore rooms whenever you want.
      - generic [ref=e76]:
        - heading "Photo screening" [level=3] [ref=e77]
        - paragraph [ref=e78]: Uploaded photos are screened automatically — blank, black, blurry, or explicit images are rejected before they're stored.
  - generic [ref=e80]:
    - heading "Join your campus community." [level=2] [ref=e81]
    - button "Create your account" [ref=e82] [cursor=pointer]
  - contentinfo [ref=e83]:
    - generic [ref=e84]: Campmatch
    - generic [ref=e89]:
      - link "How It Works" [ref=e90] [cursor=pointer]:
        - /url: "#"
      - link "Safety" [ref=e91] [cursor=pointer]:
        - /url: "#"
      - link "Supported Campuses" [ref=e92] [cursor=pointer]:
        - /url: "#"
      - link "Privacy Policy" [ref=e93] [cursor=pointer]:
        - /url: "#"
      - link "Terms of Service" [ref=e94] [cursor=pointer]:
        - /url: "#"
      - link "Support" [ref=e95] [cursor=pointer]:
        - /url: "#"
    - generic [ref=e96]: © 2026 Campmatch. Built for university students in Ghana.
  - generic [ref=e98]:
    - button "Close" [ref=e99] [cursor=pointer]
    - generic [ref=e103]:
      - button "Sign in" [ref=e104] [cursor=pointer]
      - button "Create account" [pressed] [ref=e105] [cursor=pointer]
    - generic [ref=e106]:
      - heading "Create your account" [level=2] [ref=e107]
      - paragraph [ref=e108]: Join your verified campus community.
    - generic [ref=e109]:
      - text: Student Email
      - textbox "name@ug.edu.gh" [ref=e110]
      - text: Password
      - generic [ref=e111]:
        - textbox "••••••••" [ref=e112]
        - button "Show password" [ref=e113] [cursor=pointer]: Show
      - text: Confirm Password
      - textbox "••••••••" [ref=e114]
      - button "Create account" [ref=e115] [cursor=pointer]
    - generic [ref=e116]: Accepted domains include @st.umat.edu.gh. Verification is required for all student accounts.
    - generic [ref=e117]:
      - text: By continuing, you agree to our
      - button "Terms of Service" [ref=e118] [cursor=pointer]
      - text: and
      - button "Privacy Policy" [ref=e119] [cursor=pointer]
      - text: .
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
> 29  |       await page.fill('input[name="email"]', 'test@gmail.com')
      |                  ^ Error: page.fill: Test timeout of 30000ms exceeded.
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
  88  |     await expect(page.locator('.swipe-card, .deck-arena, .match-card')).toBeVisible({ timeout: 10000 })
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
```