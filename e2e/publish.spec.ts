import { expect, test } from '@playwright/test'
import { ADMIN_TOKEN } from '../playwright.config'

test('admin authors, accepts a subset, publishes, and the viewer sees the frozen published state', async ({
  page,
}) => {
  const title = `Semiconductors ${Date.now()}`

  // Admin shell: authenticate and create a theme to author into.
  await page.goto('/admin')
  await page.getByTestId('admin-token-input').fill(ADMIN_TOKEN)
  await page.getByTestId('theme-title-input').fill(title)
  await page.getByTestId('create-theme-button').click()
  await expect(page.getByTestId('structure-workbench')).toBeVisible()

  // The viewer URL the admin shell surfaces, used after publishing.
  const viewerHref = await page.getByTestId('view-theme-link').getAttribute('href')
  expect(viewerHref).toBeTruthy()

  // Author two actors and accept both through the gate. Wait for each proposal
  // to register before adding the next so the review queue is settled.
  await page.getByTestId('actor-name-input').fill('TSMC')
  await page.getByTestId('actor-kind-input').selectOption('point')
  await page.getByTestId('actor-key-input').fill('TSM')
  await page.getByTestId('actor-tier-input').fill('foundry')
  await page.getByTestId('add-actor-button').click()
  await expect(page.getByTestId('review-actor-item')).toHaveCount(1)

  await page.getByTestId('actor-name-input').fill('Taiwan')
  await page.getByTestId('actor-kind-input').selectOption('place')
  await page.getByTestId('actor-key-input').fill('TW')
  await page.getByTestId('add-actor-button').click()
  await expect(page.getByTestId('review-actor-item')).toHaveCount(2)

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

  // Author a dependency flow TSMC → Taiwan and accept it. Power accrues to the
  // actor a flow points at, so Taiwan becomes the chokepoint.
  await page.getByTestId('flow-from-input').selectOption({ label: 'TSMC' })
  await page.getByTestId('flow-to-input').selectOption({ label: 'Taiwan' })
  await page.getByTestId('flow-substitutability-input').fill('0.1')
  await page.getByTestId('add-flow-button').click()
  await page.getByTestId('review-flow-item').getByRole('button', { name: 'Accept' }).click()
  await expect(page.getByTestId('flow-item')).toHaveCount(1)

  // Publish the accepted structure as the viewer-facing snapshot.
  await page.getByTestId('publish-button').click()
  await expect(page.getByTestId('publish-status')).toContainText('Published version 1')

  // A later working edit that is NOT republished must not reach the viewer.
  await page.getByTestId('actor-name-input').fill('Intel')
  await page.getByTestId('actor-kind-input').selectOption('point')
  await page.getByTestId('actor-key-input').fill('INTC')
  await page.getByTestId('add-actor-button').click()
  await expect(page.getByTestId('review-actor-item')).toHaveCount(1)

  // Viewer: reads the frozen published snapshot, version 1.
  await page.goto(viewerHref!)
  await expect(page.getByTestId('theme-title')).toHaveText(title)
  await expect(page.getByTestId('published-version')).toContainText('Published version 1')

  // The published structure is exactly the accepted subset at publish time.
  await expect(page.getByTestId('published-actor-item')).toHaveCount(2)
  await expect(page.getByTestId('published-flow-item')).toContainText('TSMC → Taiwan')

  // Taiwan is the strongest chokepoint (the flow points at it).
  await expect(page.getByTestId('published-power-item').first()).toContainText('Taiwan')
  await expect(page.getByTestId('published-power-item').first()).toContainText('100%')

  // The later, unpublished edit is absent from the frozen view.
  await expect(page.getByTestId('published-view')).not.toContainText('Intel')
})
