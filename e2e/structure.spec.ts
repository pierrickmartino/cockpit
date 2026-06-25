import { expect, test } from '@playwright/test'
import { ADMIN_TOKEN } from '../playwright.config'

test('admin proposes structure, accepts it through the gate, and the preview reflects accepted-only state', async ({
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

  // Add a point-actor (TSMC). It enters the review queue as a proposal and does
  // NOT yet appear in the accepted-only preview (accept-gate, ADR-0004).
  await page.getByTestId('actor-name-input').fill('TSMC')
  await page.getByTestId('actor-kind-input').selectOption('point')
  await page.getByTestId('actor-key-input').fill('TSM')
  await page.getByTestId('actor-tier-input').fill('foundry')
  await page.getByTestId('add-actor-button').click()
  await expect(page.getByTestId('review-actor-item')).toHaveCount(1)
  await expect(page.getByTestId('actor-item')).toHaveCount(0)

  // Add a place-actor (Taiwan); now two proposals await review.
  await page.getByTestId('actor-name-input').fill('Taiwan')
  await page.getByTestId('actor-kind-input').selectOption('place')
  await page.getByTestId('actor-key-input').fill('TW')
  await page.getByTestId('add-actor-button').click()
  await expect(page.getByTestId('review-actor-item')).toHaveCount(2)

  // Accept both actors; each leaves the queue and reaches the preview.
  await page
    .getByTestId('review-actor-item')
    .filter({ hasText: 'TSMC' })
    .getByRole('button', { name: 'Accept' })
    .click()
  await page
    .getByTestId('review-actor-item')
    .filter({ hasText: 'Taiwan' })
    .getByRole('button', { name: 'Accept' })
    .click()
  await expect(page.getByTestId('actor-item')).toHaveCount(2)

  // Propose a dependency flow TSMC → Taiwan carrying substitutability. It is
  // proposed, so the preview's flow list stays empty until it is accepted.
  await page.getByTestId('flow-from-input').selectOption({ label: 'TSMC' })
  await page.getByTestId('flow-to-input').selectOption({ label: 'Taiwan' })
  await page.getByTestId('flow-substitutability-input').fill('0.1')
  await page.getByTestId('add-flow-button').click()
  await expect(page.getByTestId('review-flow-item')).toHaveCount(1)
  await expect(page.getByTestId('flow-item')).toHaveCount(0)

  // Accept the flow; the accepted-only preview now reflects it.
  await page.getByTestId('review-flow-item').getByRole('button', { name: 'Accept' }).click()
  await expect(page.getByTestId('flow-item')).toHaveCount(1)
  await expect(page.getByTestId('flow-item')).toContainText('TSMC → Taiwan')
  await expect(page.getByTestId('flow-item')).toContainText('0.1')
})
