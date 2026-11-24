import { defineConfig, devices } from '@playwright/test'

/**
 * Campmatch E2E test configuration.
 *
 * These tests run against locally running dev servers:
 *   Frontend: http://localhost:5173 (Vite)
 *   Backend:  http://localhost:8000 (FastAPI + WebSocket)
 *
 * Start them before running:
 *   cd backend && uvicorn app.main:app --port 8000   (SECRET_KEY set)
 *   cd frontend && npm run dev                        (port 5173)
 *
 * See DEPLOYMENT.md for required env vars (SECRET_KEY, GOOGLE_CLIENT_ID, etc.).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: [
    {
      command: 'cd backend && python -m uvicorn app.main:app --port 8000',
      cwd: require('path').resolve(__dirname, '..', '..'),
      port: 8000,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'cd frontend && npm run dev',
      cwd: require('path').resolve(__dirname, '..', '..'),
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
})
