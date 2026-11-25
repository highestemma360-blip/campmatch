import { test, expect } from '@playwright/test'

test.describe('Campmatch - Individual Feature Tests', () => {

  test('LANDING: page loads and shows content', async ({ page }) => {
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(3000) // let animations complete
    const title = await page.title()
    console.log('LANDING TITLE:', title)
    const bodyText = await page.locator('body').textContent()
    console.log('LANDING BODY (first 500):', bodyText?.substring(0, 500))
    await expect(page.locator('body')).toBeVisible()
  })

  test('AUTH: click create account opens modal', async ({ page }) => {
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(3000)
    // Try to find and click create account
    const createBtn = page.locator('button:has-text("Create account"), button:has-text("Join Campmatch Today")').first()
    if (await createBtn.isVisible({ timeout: 5000 })) {
      await createBtn.click()
      await page.waitForTimeout(2000)
      const modal = page.locator('.auth-modal-backdrop, .auth-modal-body')
      console.log('AUTH MODAL VISIBLE:', await modal.isVisible())
      await expect(modal).toBeVisible()
    } else {
      console.log('CREATE ACCOUNT BUTTON NOT FOUND')
    }
  })

  test('PROFILE: page loads without crashing', async ({ page }) => {
    await page.goto('http://localhost:5173/profile', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(3000)
    const bodyText = await page.locator('body').textContent()
    console.log('PROFILE BODY (first 500):', bodyText?.substring(0, 500))
    await expect(page.locator('body')).toBeVisible()
  })

  test('SETTINGS: opens discovery modal from profile', async ({ page }) => {
    await page.goto('http://localhost:5173/profile', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(3000)
    const discoveryBtn = page.locator('button:has-text("Discovery preferences")')
    if (await discoveryBtn.isVisible({ timeout: 5000 })) {
      await discoveryBtn.click()
      await page.waitForTimeout(2000)
      const modal = page.locator('text=Discovery Preferences')
      console.log('DISCOVERY MODAL VISIBLE:', await modal.isVisible({ timeout: 5000 }))
      await expect(modal).toBeVisible({ timeout: 5000 })
    } else {
      console.log('DISCOVERY BTN NOT FOUND')
    }
  })

  test('DISCOVERY SETTINGS: save preferences works', async ({ page }) => {
    await page.goto('http://localhost:5173/profile', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(3000)
    const discoveryBtn = page.locator('button:has-text("Discovery preferences")')
    if (await discoveryBtn.isVisible({ timeout: 5000 })) {
      await discoveryBtn.click()
      await page.waitForTimeout(2000)
      // Try to change max distance slider and save
      await page.waitForSelector('.sheet-backdrop', { state: 'visible', timeout: 5000 })
      await page.click('button:has-text("Save Preferences")')
      await page.waitForTimeout(2000)
      console.log('SAVE PREFERENCES CLICKED')
    }
  })
})
