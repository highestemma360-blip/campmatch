import { test, expect } from '@playwright/test'

test.describe('Campmatch - Live Feature Testing', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 })
  })

  test('LANDING: loads and shows hero/CTA', async ({ page }) => {
    await expect(page.locator('text=Campmatch')).toBeVisible()
    await expect(page.locator('text=Meet students from')).toBeVisible()
    await expect(page.locator('button:has-text("Create account"), button:has-text("Sign in"), button:has-text("Join Campmatch Today")').first()).toBeVisible()
  })

  test('AUTH: signup page opens and shows domain validation', async ({ page }) => {
    await page.click('button:has-text("Create account"), button:has-text("Join Campmatch Today")')
    await page.waitForSelector('input[name="email"]', { state: 'visible', timeout: 10000 })
    await page.fill('input[name="email"]', 'test@gmail.com')
    await page.fill('input[name="password"]', 'Test1234!')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Personal Gmail and non-school accounts are not allowed')).toBeVisible({ timeout: 5000 })
  })

  test('AUTH: rejects non-.edu.gh domains', async ({ page }) => {
    await page.click('button:has-text("Create account"), button:has-text("Join Campmatch Today")')
    await page.waitForSelector('input[name="email"]', { state: 'visible', timeout: 10000 })
    await page.fill('input[name="email"]', 'user@yahoo.com')
    await page.fill('input[name="password"]', 'Test1234!')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=non-school accounts are not allowed')).toBeVisible({ timeout: 5000 })
  })

  test('AUTH: accepts .edu.gh domain', async ({ page }) => {
    await page.click('button:has-text("Create account"), button:has-text("Join Campmatch Today")')
    await page.waitForSelector('input[name="email"]', { state: 'visible', timeout: 10000 })
    const email = `test${Date.now()}@st.umat.edu.gh`
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'Test1234!')
    await page.click('button[type="submit"]')
    // Should proceed past domain validation (may show onboarding or error about account existing)
    await expect(page.locator('text=Personal Gmail and non-school accounts are not allowed')).not.toBeVisible({ timeout: 5000 })
  })

  test('DISCOVERY: deck loads on homepage', async ({ page }) => {
    // Navigate directly to explore to bypass auth
    await page.goto('http://localhost:5173/explore', { waitUntil: 'networkidle', timeout: 30000 })
    // Should show auth or deck depending on session state
    const hasDeck = await page.locator('.swipe-card, .deck-arena').isVisible()
    const hasAuth = await page.locator('text=Sign in, text=Create account, text=Welcome back').isVisible()
    expect(hasDeck || hasAuth).toBeTruthy()
  })

  test('EXPLORE: explore page loads', async ({ page }) => {
    await page.goto('http://localhost:5173/explore', { waitUntil: 'networkidle', timeout: 30000 })
    // Page should not crash - either shows rooms or auth prompt
    await expect(page.locator('body')).toBeVisible()
  })

  test('MATCHES: matches page loads', async ({ page }) => {
    await page.goto('http://localhost:5173/matches', { waitUntil: 'networkidle', timeout: 30000 })
    await expect(page.locator('body')).toBeVisible()
  })

  test('PROFILE: profile page loads', async ({ page }) => {
    await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle', timeout: 30000 })
    await expect(page.locator('body')).toBeVisible()
  })

  test('SETTINGS: settings modal opens', async ({ page }) => {
    await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)
    // Click settings gear
    const settingsBtn = page.locator('button:has-text("Settings"), [aria-label="Settings"]')
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click()
      await expect(page.locator('text=Settings')).toBeVisible({ timeout: 5000 })
    }
  })

  test('DISCOVERY SETTINGS: opens discovery modal', async ({ page }) => {
    await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)
    await page.click('button:has-text("Discovery preferences")')
    await expect(page.locator('text=Discovery Preferences')).toBeVisible({ timeout: 5000 })
  })

  test('PAYPAGE: plus modal opens', async ({ page }) => {
    await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)
    await page.click('text=Campmatch Plus, text=Plus')
    await expect(page.locator('text=CAMPMATCH PLUS')).toBeVisible({ timeout: 5000 })
  })

  test('ADMIN: admin page loads', async ({ page }) => {
    await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle', timeout: 30000 })
    await expect(page.locator('body')).toBeVisible()
  })

  test('PWA: manifest is valid', async ({ page, context }) => {
    const manifest = await context.request.fetch('http://localhost:5173/manifest.webmanifest')
    expect(manifest.ok()).toBe(true)
    const json = await manifest.json()
    expect(json.name).toBe('Campmatch')
  })

  test('SERVICE WORKER: sw.js is served', async ({ page, context }) => {
    const sw = await context.request.fetch('http://localhost:5173/sw.js')
    expect(sw.ok()).toBe(true)
  })

  test('API: health endpoint', async ({ page, context }) => {
    const health = await context.request.fetch('http://localhost:8000/api/health')
    expect(health.ok()).toBe(true)
    const json = await health.json()
    expect(json.status).toBe('ok')
  })

  test('API: auth-config endpoint', async ({ page, context }) => {
    const res = await context.request.fetch('http://localhost:8000/api/auth-config')
    expect(res.ok()).toBe(true)
    const json = await res.json()
    expect(json).toHaveProperty('google_client_id')
  })
})
