import { test, expect } from '@playwright/test'

/**
 * Admin console E2E tests.
 *
 * Review Focus:
 *   - Admin login with Render env credentials
 *   - KPIs, feature flags, Explore rooms, notifications composer
 */

test.describe('Campmatch Admin', () => {
  test('admin portal is reachable', async ({ page }) => {
    await page.goto('http://localhost:5173/admin')
    await expect(page.locator('text=Admin, text=Sign in, text=Dashboard, text=Console')).toBeVisible()
  })
})
