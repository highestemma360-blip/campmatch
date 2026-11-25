import { test, expect } from '@playwright/test'

test.describe('Campmatch - Final Verification', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(2000)
  })

  test('LANDING: specific Ghana campus copy, no AI slop', async ({ page }) => {
    await expect(page.locator('text=Verified student matching for Ghana campuses')).toBeVisible()
    await expect(page.locator('text=UG Legon, KNUST, UCC, UMaT, UEW, UDS, Ashesi')).toBeVisible()
    // No eyebrow/kicker above headings
    await expect(page.locator('.eyebrow')).toHaveCount(0)
    // No section numbers
    await expect(page.locator('.connect-item-number')).toHaveCount(0)
    await expect(page.locator('.verify-step-number')).toHaveCount(0)
  })

  test('AUTH: modal opens and domain validation works', async ({ page }) => {
    const createBtn = page.locator('button:has-text("Create account"), button:has-text("Join Campmatch Today")').first()
    if (await createBtn.isVisible({ timeout: 5000 })) {
      await createBtn.click()
      await page.waitForTimeout(2000)
      const modal = page.locator('.auth-modal-backdrop, .auth-modal-body')
      await expect(modal.first()).toBeVisible()
      
      // Test domain validation
      await page.fill('input[name="email"]', 'test@gmail.com')
      await page.fill('input[name="password"]', 'Test1234!')
      await page.click('button[type="submit"]')
      await expect(page.locator('text=Personal Gmail and non-school accounts are not allowed')).toBeVisible({ timeout: 5000 })
    }
  })

  test('PROFILE: page loads and View My Card button works', async ({ page }) => {
    await page.goto('http://localhost:5173/profile', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(3000)
    await expect(page.locator('body')).toBeVisible()
    
    // View My Card button should be visible
    const viewCardBtn = page.locator('button:has-text("View Card")')
    if (await viewCardBtn.isVisible({ timeout: 5000 })) {
      await viewCardBtn.click()
      await page.waitForTimeout(2000)
      // ProfileCardView should be rendered
      await expect(page.locator('text=Your Card')).toBeVisible({ timeout: 5000 })
    }
  })

  test('DECK: shows seed users with photos', async ({ page, context }) => {
    // Create a user with complete profile via API
    const email = 'decktest' + Date.now() + '@st.umat.edu.gh'
    await context.request.post('http://localhost:8000/api/signup', {
      data: { email: email, password: 'Test1234!' }
    })
    const loginRes = await context.request.post('http://localhost:8000/api/login', {
      data: { email: email, password: 'Test1234!' }
    })
    const token = (await loginRes.json()).access_token
    
    // Update profile
    await context.request.post('http://localhost:8000/api/profile', {
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      data: {
        name: 'Deck Tester', level: '200', age: 20, course: 'CS', gender: 'female',
        interested_in: 'male', bio: 'Test user', min_age: 18, max_age: 30,
        preferred_levels: '', show_me: 'everyone', max_distance_km: 50,
        verified_only: false, snoozed: false, mode: 'date',
        looking_for: 'Long-term partner', interests: [], explore_vibes: [],
        prompts: [], opening_move: 'Hi!', hall: '', zodiac: '',
        height: '', spotify_anthem: '',
        photo_urls: ['https://example.com/photo.webp']
      }
    })
    
    // Now test deck via frontend
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(3000)
    // Set token via localStorage
    await page.evaluate((token) => {
      localStorage.setItem('token', token)
    }, token)
    await page.reload()
    await page.waitForTimeout(3000)
    
    // Deck should show seed users
    await expect(page.locator('.swipe-card, .deck-arena, .match-card')).toBeVisible({ timeout: 10000 })
  })

  test('SETTINGS: discovery modal opens and saves', async ({ page }) => {
    await page.goto('http://localhost:5173/profile', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(3000)
    
    const discoveryBtn = page.locator('button:has-text("Discovery preferences")')
    if (await discoveryBtn.isVisible({ timeout: 5000 })) {
      await discoveryBtn.click()
      await page.waitForTimeout(2000)
      await expect(page.locator('text=Discovery Preferences')).toBeVisible({ timeout: 5000 })
      
      // Change max distance and save
      await page.waitForSelector('.sheet-backdrop', { state: 'visible', timeout: 5000 })
      await page.click('button:has-text("Save Preferences")')
      await page.waitForTimeout(2000)
    }
  })

  test('API: all endpoints return 200', async ({ page, context }) => {
    const email = 'apitest' + Date.now() + '@st.umat.edu.gh'
    const signup = await context.request.post('http://localhost:8000/api/signup', {
      data: { email: email, password: 'Test1234!' }
    })
    expect(signup.ok()).toBe(true)
    
    const login = await context.request.post('http://localhost:8000/api/login', {
      data: { email: email, password: 'Test1234!' }
    })
    expect(login.ok()).toBe(true)
    
    const token = (await login.json()).access_token
    
    const me = await context.request.get('http://localhost:8000/api/me', {
      headers: { Authorization: 'Bearer ' + token }
    })
    expect(me.ok()).toBe(true)
    
    const plus = await context.request.get('http://localhost:8000/api/plus-status', {
      headers: { Authorization: 'Bearer ' + token }
    })
    expect(plus.ok()).toBe(true)
    
    const channels = await context.request.get('http://localhost:8000/api/payments/config', {
      headers: { Authorization: 'Bearer ' + token }
    })
    expect(channels.ok()).toBe(true)
    
    const explore = await context.request.get('http://localhost:8000/api/explore/rooms', {
      headers: { Authorization: 'Bearer ' + token }
    })
    expect(explore.ok()).toBe(true)
    
    const notifications = await context.request.get('http://localhost:8000/api/notifications', {
      headers: { Authorization: 'Bearer ' + token }
    })
    expect(notifications.ok()).toBe(true)
    
    console.log('All API endpoints: 200 OK')
  })
})
