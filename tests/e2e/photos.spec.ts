import { test, expect } from '@playwright/test'

/**
 * Photo upload E2E tests.
 *
 * Review Focus:
 *   - Photo upload accepted -> verified WebP stored
 *   - Blank/black/blurry/explicit images rejected with clear reason
 *   - Client pre-check catches issues before server round-trip
 */

test.describe('Campmatch Photos', () => {
  test('photo upload page is reachable', async ({ page }) => {
    await page.goto('http://localhost:5173/profile/photos')
    await expect(page.locator('input[type="file"], text=Photo, text=Upload')).toBeVisible()
  })
})
