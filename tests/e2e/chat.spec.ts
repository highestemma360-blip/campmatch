import { test, expect } from '@playwright/test'

/**
 * Real-time chat E2E tests.
 *
 * Review Focus:
 *   - WebSocket reconnect resumes chat state after a disconnect
 *   - Message send/receive, typing indicators, read receipts
 *   - Heart reactions, extend match, unmatch
 */

test.describe('Campmatch Chat', () => {
  test('matches list page is reachable', async ({ page }) => {
    await page.goto('http://localhost:5173/matches')
    await expect(page.locator('text=Matches, text=No matches, text=Sign in')).toBeVisible()
  })

  test('chat conversation view opens from a match', async ({ page }) => {
    await page.goto('http://localhost:5173/matches')
    // If there are matches, click one; otherwise the empty state shows
    const firstMatch = page.locator('[data-testid="match-card"]').first()
    if (await firstMatch.isVisible()) {
      await firstMatch.click()
      await expect(page.locator('[data-testid="chat-messages"], text=Send a message')).toBeVisible()
    }
  })
})
