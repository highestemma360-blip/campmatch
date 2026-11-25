# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\e2e\final-verification.spec.ts >> Campmatch - Final Verification >> LANDING: specific Ghana campus copy, no AI slop
- Location: tests\e2e\final-verification.spec.ts:10:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Verified student matching for Ghana campuses')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('text=Verified student matching for Ghana campuses') with timeout 5000ms
  - waiting for locator('text=Verified student matching for Ghana campuses')

```

```yaml
- text: Campmatch
- heading "Meet students on your campus." [level=1]
- paragraph: Verified university students at UG Legon, KNUST, UCC, UMaT, UEW, UDS, and technical colleges across Ghana. Sign in with your .edu.gh email to match with students in your hall, faculty, and Explore rooms.
- button "Create account"
- button "Sign in"
- button "Browse Explore rooms →"
- heading "Match with students in your hall and faculty." [level=2]
- paragraph: Opt into Explore rooms for your vibe, swipe through verified students, and chat only after you match. No outsiders, no fake profiles.
- heading "Sign in with .edu.gh" [level=3]
- paragraph: Register with your institutional email (student@st.umat.edu.gh, name@ug.edu.gh). Your profile is tied to your university domain.
- heading "Opt into Explore rooms" [level=3]
- paragraph: Choose rooms like Study Buddy, Food Date, Long Term, Night Stand, Walk Around, or Escort Tonight. Your card appears only in rooms you join.
- heading "Match and chat" [level=3]
- paragraph: Swipe through verified students in your rooms. When you both like, the chat opens — no unsolicited DMs, no outsiders.
- heading "Every profile is tied to a real .edu.gh email." [level=2]
- paragraph: Campmatch is built for Ghana university students. We verify your institutional email domain and screen profile photos so every card you swipe is a real student — not a bot, not a scammer.
- heading "Enter your university email" [level=3]
- paragraph: Sign up with your institutional .edu.gh email (e.g., student@st.umat.edu.gh, name@ug.edu.gh). Personal Gmail, Yahoo, and Outlook addresses are not accepted.
- heading "Verify your email" [level=3]
- paragraph: Enter the confirmation code sent to your university inbox to unlock your verified student badge.
- heading "Upload a real photo" [level=3]
- paragraph: Your profile photo is screened automatically — blank, black, blurry, or explicit images are rejected before they're saved.
- heading "Choose your intent and connect" [level=3]
- paragraph: Select Dating, Friends, or Study. Set campus filters and start matching mutually with verified students in your Explore rooms.
- heading "Built for universities across Ghana." [level=2]
- paragraph: We support institutional .edu.gh domains from universities and technical colleges nationwide. If your domain isn't listed, request it and we'll add it.
- text: UG LegonKNUSTUCCUMaTAshesiUEWUDSGIMPAUPSATechnical Universities Don’t see your .edu.gh domain? Request your campus.
- heading "No outsiders. No unsolicited DMs." [level=2]
- paragraph: Every feature is designed around the university student experience — from verification to visibility controls.
- heading "Institutional .edu.gh verification" [level=3]
- paragraph: Every profile is tied to an active university email domain — no outsiders, no fake accounts.
- heading "Double opt-in chat" [level=3]
- paragraph: No unsolicited DMs — messaging only opens when both students match.
- heading "Visibility & controls" [level=3]
- paragraph: Filter who sees you by campus or mode, block or report anyone anytime, and opt out of Explore rooms whenever you want.
- heading "Photo screening" [level=3]
- paragraph: Uploaded photos are screened automatically — blank, black, blurry, or explicit images are rejected before they're stored.
- heading "Join your campus community." [level=2]
- button "Create your account"
- contentinfo:
  - text: Campmatch
  - link "How It Works":
    - /url: "#"
  - link "Safety":
    - /url: "#"
  - link "Supported Campuses":
    - /url: "#"
  - link "Privacy Policy":
    - /url: "#"
  - link "Terms of Service":
    - /url: "#"
  - link "Support":
    - /url: "#"
  - text: © 2026 Campmatch. Built for university students in Ghana.
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
> 11  |     await expect(page.locator('text=Verified student matching for Ghana campuses')).toBeVisible()
      |                                                                                     ^ Error: expect(locator).toBeVisible() failed
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
```