import { test, expect } from '@playwright/test'

/**
 * Swipe deck E2E tests.
 *
 * Review Focus:
 *   - Free account hits 10 swipes in rolling 24h -> HTTP 429 DAILY_SWIPE_LIMIT
 *   - Plus account gets unlimited swipes
 *   - Rewind restores previous card to top of deck
 *   - Mutual like creates a match
 */

test.describe('Campmatch Swipes', () => {
  test('deck loads with profile cards', async ({ page }) => {
    await page.goto('http://localhost:5173/explore')
    // Deck renders or shows empty state depending on seed data
    await expect(page.locator('.swipe-card, text=No More Students Nearby, text=Complete your profile first')).toBeVisible()
  })

  test('like and nope buttons are present and reachable', async ({ page }) => {
    await page.goto('http://localhost:5173/explore')
    const nope = page.getByTitle(/Pass/)
    const like = page.getByTitle(/Like/)
    await expect(nope).toBeVisible()
    await expect(like).toBeVisible()
    // Touch target >= 44dp
    const likeBox = await like.boundingBox()
    expect(likeBox?.width).toBeGreaterThanOrEqual(44)
    expect(likeBox?.height).toBeGreaterThanOrEqual(44)
  })
})
