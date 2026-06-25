import { expect, test } from '@playwright/test'
import { ADMIN_TOKEN } from '../playwright.config'

test('admin authors actors and a flow, and the workbench preview reflects them', async ({
  page,
}) => {
  const title = `Semiconductors ${Date.now()}`

  // Admin shell: authenticate, then create a theme to author into.
  await page.goto('/admin')
  await page.getByTestId('admin-token-input').fill(ADMIN_TOKEN)
  await page.getByTestId('theme-title-input').fill(title)
  await page.getByTestId('create-theme-button').click()

  // The structure workbench appears once a theme exists.
  await expect(page.getByTestId('structure-workbench')).toBeVisible()

  // Add a point-actor (TSMC).
  await page.getByTestId('actor-name-input').fill('TSMC')
  await page.getByTestId('actor-kind-input').selectOption('point')
  await page.getByTestId('actor-key-input').fill('TSM')
  await page.getByTestId('actor-tier-input').fill('foundry')
  await page.getByTestId('add-actor-button').click()
  await expect(page.getByTestId('actor-item')).toHaveCount(1)

  // Add a place-actor (Taiwan).
  await page.getByTestId('actor-name-input').fill('Taiwan')
  await page.getByTestId('actor-kind-input').selectOption('place')
  await page.getByTestId('actor-key-input').fill('TW')
  await page.getByTestId('add-actor-button').click()
  await expect(page.getByTestId('actor-item')).toHaveCount(2)

  // Add a dependency flow TSMC → Taiwan carrying substitutability.
  await page.getByTestId('flow-from-input').selectOption({ label: 'TSMC' })
  await page.getByTestId('flow-to-input').selectOption({ label: 'Taiwan' })
  await page.getByTestId('flow-substitutability-input').fill('0.1')
  await page.getByTestId('add-flow-button').click()

  // Preview reflects the authored structure.
  await expect(page.getByTestId('flow-item')).toHaveCount(1)
  await expect(page.getByTestId('flow-item')).toContainText('TSMC → Taiwan')
  await expect(page.getByTestId('flow-item')).toContainText('0.1')
})
