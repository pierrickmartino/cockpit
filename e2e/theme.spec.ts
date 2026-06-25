import { expect, test } from '@playwright/test'

test('admin creates an empty theme and the viewer displays it', async ({ page }) => {
  const title = `Semiconductors ${Date.now()}`

  // Admin shell: create a theme.
  await page.goto('/admin')
  await page.getByTestId('theme-title-input').fill(title)
  await page.getByTestId('create-theme-button').click()

  // Follow the link the admin shell surfaces to the viewer.
  await page.getByTestId('view-theme-link').click()

  // Viewer shell: the persisted theme is displayed.
  await expect(page.getByTestId('theme-title')).toHaveText(title)
  await expect(page.getByTestId('theme-state')).toContainText('working')
})
