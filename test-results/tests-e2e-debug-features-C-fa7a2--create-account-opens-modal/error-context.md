# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\e2e\debug-features.spec.ts >> Campmatch - Individual Feature Tests >> AUTH: click create account opens modal
- Location: tests\e2e\debug-features.spec.ts:15:3

# Error details

```
Error: locator.isVisible: Error: strict mode violation: locator('.auth-modal-backdrop, .auth-modal-body') resolved to 2 elements:
    1) <div class="auth-modal-backdrop">…</div> aka locator('div').filter({ hasText: 'Sign inCreate accountCreate' }).nth(2)
    2) <div class="auth-modal-body">…</div> aka getByText('Sign inCreate accountCreate')

Call log:
    - checking visibility of locator('.auth-modal-backdrop, .auth-modal-body')

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
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('Campmatch - Individual Feature Tests', () => {
  4  | 
  5  |   test('LANDING: page loads and shows content', async ({ page }) => {
  6  |     await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 })
  7  |     await page.waitForTimeout(3000) // let animations complete
  8  |     const title = await page.title()
  9  |     console.log('LANDING TITLE:', title)
  10 |     const bodyText = await page.locator('body').textContent()
  11 |     console.log('LANDING BODY (first 500):', bodyText?.substring(0, 500))
  12 |     await expect(page.locator('body')).toBeVisible()
  13 |   })
  14 | 
  15 |   test('AUTH: click create account opens modal', async ({ page }) => {
  16 |     await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 })
  17 |     await page.waitForTimeout(3000)
  18 |     // Try to find and click create account
  19 |     const createBtn = page.locator('button:has-text("Create account"), button:has-text("Join Campmatch Today")').first()
  20 |     if (await createBtn.isVisible({ timeout: 5000 })) {
  21 |       await createBtn.click()
  22 |       await page.waitForTimeout(2000)
  23 |       const modal = page.locator('.auth-modal-backdrop, .auth-modal-body')
> 24 |       console.log('AUTH MODAL VISIBLE:', await modal.isVisible())
     |                                                      ^ Error: locator.isVisible: Error: strict mode violation: locator('.auth-modal-backdrop, .auth-modal-body') resolved to 2 elements:
  25 |       await expect(modal).toBeVisible()
  26 |     } else {
  27 |       console.log('CREATE ACCOUNT BUTTON NOT FOUND')
  28 |     }
  29 |   })
  30 | 
  31 |   test('PROFILE: page loads without crashing', async ({ page }) => {
  32 |     await page.goto('http://localhost:5173/profile', { waitUntil: 'domcontentloaded', timeout: 15000 })
  33 |     await page.waitForTimeout(3000)
  34 |     const bodyText = await page.locator('body').textContent()
  35 |     console.log('PROFILE BODY (first 500):', bodyText?.substring(0, 500))
  36 |     await expect(page.locator('body')).toBeVisible()
  37 |   })
  38 | 
  39 |   test('SETTINGS: opens discovery modal from profile', async ({ page }) => {
  40 |     await page.goto('http://localhost:5173/profile', { waitUntil: 'domcontentloaded', timeout: 15000 })
  41 |     await page.waitForTimeout(3000)
  42 |     const discoveryBtn = page.locator('button:has-text("Discovery preferences")')
  43 |     if (await discoveryBtn.isVisible({ timeout: 5000 })) {
  44 |       await discoveryBtn.click()
  45 |       await page.waitForTimeout(2000)
  46 |       const modal = page.locator('text=Discovery Preferences')
  47 |       console.log('DISCOVERY MODAL VISIBLE:', await modal.isVisible({ timeout: 5000 }))
  48 |       await expect(modal).toBeVisible({ timeout: 5000 })
  49 |     } else {
  50 |       console.log('DISCOVERY BTN NOT FOUND')
  51 |     }
  52 |   })
  53 | 
  54 |   test('DISCOVERY SETTINGS: save preferences works', async ({ page }) => {
  55 |     await page.goto('http://localhost:5173/profile', { waitUntil: 'domcontentloaded', timeout: 15000 })
  56 |     await page.waitForTimeout(3000)
  57 |     const discoveryBtn = page.locator('button:has-text("Discovery preferences")')
  58 |     if (await discoveryBtn.isVisible({ timeout: 5000 })) {
  59 |       await discoveryBtn.click()
  60 |       await page.waitForTimeout(2000)
  61 |       // Try to change max distance slider and save
  62 |       await page.waitForSelector('.sheet-backdrop', { state: 'visible', timeout: 5000 })
  63 |       await page.click('button:has-text("Save Preferences")')
  64 |       await page.waitForTimeout(2000)
  65 |       console.log('SAVE PREFERENCES CLICKED')
  66 |     }
  67 |   })
  68 | })
  69 | 
```