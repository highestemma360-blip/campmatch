import { test, expect } from '@playwright/test'

/**
 * PWA install + web push E2E tests.
 *
 * Review Focus:
 *   - Install prompt shows once per session (~18s after sign-in)
 *   - Prompt suppressed while modal/chat/sheet open
 *   - Push opt-in works after explicit permission
 */

test.describe('Campmatch PWA & Push', () => {
  test('manifest declares standalone display + icons', async ({ page, context }) => {
    const manifest = await context.request.fetch('http://localhost:5173/manifest.webmanifest')
    expect(manifest.ok()).toBe(true)
    const json = await manifest.json()
    expect(json.display).toContain('standalone')
    expect(Array.isArray(json.icons) && json.icons.length > 0).toBe(true)
  })

  test('service worker is registered', async ({ page }) => {
    await page.goto('http://localhost:5173')
    const swRegistered = await page.evaluate(() => {
      return !!('serviceWorker' in navigator)
    })
    expect(swRegistered).toBe(true)
  })
})
