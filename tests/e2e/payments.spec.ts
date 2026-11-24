import { test, expect } from '@playwright/test'

/**
 * Payments E2E tests.
 *
 * Review Focus:
 *   - Plus checkout initiates Moolre flow
 *   - Valid Moolre webhook signature activates Plus within seconds
 *   - Invalid signature returns 400
 */

test.describe('Campmatch Payments', () => {
  test('Plus checkout page is reachable', async ({ page }) => {
    await page.goto('http://localhost:5173/profile/plus')
    await expect(page.locator('text=Plus, text=Checkout, text=Subscribe, text=Sign in')).toBeVisible()
  })
})
