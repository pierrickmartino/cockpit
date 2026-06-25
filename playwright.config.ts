import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

const PORT = 3100
const baseURL = `http://127.0.0.1:${PORT}`

// Admin credential for the authoring routes. CI provides ADMIN_TOKEN; locally we
// fall back to a fixed dev value. The E2E spec reads the same value so the admin
// shell can authenticate against the server started below.
export const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'e2e-admin-token'

// In this managed environment Chromium is pre-installed; CI installs its own.
const preinstalledChromium = '/opt/pw-browsers/chromium'
const executablePath =
  !process.env.CI && existsSync(preinstalledChromium) ? preinstalledChromium : undefined

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { ADMIN_TOKEN },
  },
})
