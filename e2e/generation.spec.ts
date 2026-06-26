import { expect, test } from '@playwright/test'
import { ADMIN_TOKEN, GENERATION_FIXTURE } from '../playwright.config'

const [tsmc, taiwan, asml] = GENERATION_FIXTURE.proposedActors
const [tsmcToTaiwan] = GENERATION_FIXTURE.proposedFlows

test('admin converses, reviews grounded proposals, accepts a subset, publishes, and the viewer sees the cited accepted structure', async ({
  page,
}) => {
  const title = `Semiconductors ${Date.now()}`

  // Admin shell: authenticate and create a theme to author into.
  await page.goto('/admin')
  await page.getByTestId('admin-token-input').fill(ADMIN_TOKEN)
  await page.getByTestId('theme-title-input').fill(title)
  await page.getByTestId('create-theme-button').click()
  await expect(page.getByTestId('structure-workbench')).toBeVisible()

  const viewerHref = await page.getByTestId('view-theme-link').getAttribute('href')
  expect(viewerHref).toBeTruthy()

  // Converse: send a turn. The fake model proposes a grounded actor pair, a third
  // actor, and a dependency flow, surfaced as the model reply and per-turn report.
  await page.getByTestId('conversation-input').fill('Build the AI compute graph.')
  await page.getByTestId('conversation-send').click()
  await expect(page.getByTestId('conversation-message').last()).toContainText(GENERATION_FIXTURE.reply)
  await expect(page.getByTestId('turn-report')).toContainText('TSMC')

  // The proposals land in the review queue (three actors, one flow) as `proposed`,
  // so the accepted-only preview is still empty (accept-gate, ADR-0004).
  await expect(page.getByTestId('review-actor-item')).toHaveCount(3)
  await expect(page.getByTestId('review-flow-item')).toHaveCount(1)
  await expect(page.getByTestId('actor-item')).toHaveCount(0)

  // Citations are visible, grouped by claim, with the retrieved snippet (ADR-0015).
  const tsmcItem = page.getByTestId('review-actor-item').filter({ hasText: tsmc.name })
  await expect(tsmcItem.getByTestId('claim-group-relevance')).toContainText(
    tsmc.citations[0].quotedText,
  )

  // A secondary claim with no citation is flagged unsourced — derived, not stored:
  // TSMC asserts a tier but cites only relevance, and the flow cites only its
  // dependency, leaving substitutability unsourced.
  await expect(tsmcItem.getByTestId('claim-group-tier').getByTestId('unsourced-flag')).toBeVisible()
  await expect(
    page
      .getByTestId('review-flow-item')
      .getByTestId('claim-group-substitutability')
      .getByTestId('unsourced-flag'),
  ).toBeVisible()

  // Accept a strict subset: the TSMC ↔ Taiwan pair and their flow, leaving ASML
  // proposed. Each accepted actor leaves the queue and reaches the preview.
  await page
    .getByTestId('review-actor-item')
    .filter({ hasText: tsmc.name })
    .getByRole('button', { name: 'Accept' })
    .click()
  await page
    .getByTestId('review-actor-item')
    .filter({ hasText: taiwan.name })
    .getByRole('button', { name: 'Accept' })
    .click()
  await expect(page.getByTestId('actor-item')).toHaveCount(2)

  await page.getByTestId('review-flow-item').getByRole('button', { name: 'Accept' }).click()
  await expect(page.getByTestId('flow-item')).toHaveCount(1)

  // ASML stays in the queue — it was never accepted.
  await expect(page.getByTestId('review-actor-item')).toHaveCount(1)
  await expect(page.getByTestId('review-actor-item')).toContainText(asml.name)

  // Publish the accepted subset as the viewer-facing snapshot.
  await page.getByTestId('publish-button').click()
  await expect(page.getByTestId('publish-status')).toContainText('Published version 1')

  // Viewer: reads the frozen published snapshot — the accepted, cited structure.
  // Generation never runs here; the viewer only reads the published snapshot.
  await page.goto(viewerHref!)
  await expect(page.getByTestId('theme-title')).toHaveText(title)
  await expect(page.getByTestId('published-version')).toContainText('Published version 1')
  await expect(page.getByTestId('published-actor-item')).toHaveCount(2)
  await expect(page.getByTestId('published-flow-item')).toContainText(
    `${tsmc.name} → ${taiwan.name}`,
  )
  await expect(page.getByTestId('published-flow-item')).toContainText(
    String(tsmcToTaiwan.substitutability),
  )

  // The unaccepted actor never reaches the viewer.
  await expect(page.getByTestId('published-view')).not.toContainText(asml.name)
})
