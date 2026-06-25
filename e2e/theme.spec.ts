import { expect, test } from '@playwright/test'
import { ADMIN_TOKEN } from '../playwright.config'

test('admin creates an empty theme and the viewer displays it', async ({ page }) => {
  const title = `Semiconductors ${Date.now()}`

  // Admin shell: authenticate with the admin token, then create a theme.
  await page.goto('/admin')
  await page.getByTestId('admin-token-input').fill(ADMIN_TOKEN)
  await page.getByTestId('theme-title-input').fill(title)
  await page.getByTestId('create-theme-button').click()

  // Follow the link the admin shell surfaces to the viewer.
  await page.getByTestId('view-theme-link').click()

  // Viewer shell: the theme is displayed, but with nothing published yet the
  // viewer shows the empty state — it reads published snapshots, not the
  // working state (ADR-0012).
  await expect(page.getByTestId('theme-title')).toHaveText(title)
  await expect(page.getByTestId('not-published')).toBeVisible()
})
