import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

const PORT = 3100
const baseURL = `http://127.0.0.1:${PORT}`

// Admin credential for the authoring routes. CI provides ADMIN_TOKEN; locally we
// fall back to a fixed dev value. The E2E spec reads the same value so the admin
// shell can authenticate against the server started below.
export const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'e2e-admin-token'

// Deterministic generation fixture for the E2E (ADR-0021). The real Anthropic
// adapter cannot run in CI, so the conversation flow is driven by replaying this
// canned GenerationResult through the `GENERATION_FAKE_SCRIPT` seam. The data
// lives here (test/config), never in `src`. It proposes a grounded actor pair
// and a flow, with two *secondary* claims left uncited so the review queue's
// derived "unsourced" flags are exercised: TSMC's `tier` and the flow's
// `substitutability`. A third actor (ASML) is proposed but left unaccepted so
// the spec can accept a strict subset before publishing.
export const GENERATION_FIXTURE = {
  reply: 'Proposed TSMC, Taiwan, ASML, and the TSMC → Taiwan dependency.',
  proposedActors: [
    {
      ref: 'tsmc',
      name: 'TSMC',
      kind: 'point',
      actorKey: 'TSM',
      tier: 'foundry',
      citations: [
        {
          claim: 'relevance',
          url: 'https://example.test/tsmc',
          title: 'TSMC and AI compute',
          quotedText: 'TSMC is central to AI compute supply.',
        },
      ],
    },
    {
      ref: 'taiwan',
      name: 'Taiwan',
      kind: 'place',
      actorKey: 'TW',
      citations: [
        {
          claim: 'relevance',
          url: 'https://example.test/taiwan',
          title: 'Taiwan semiconductor hub',
          quotedText: 'Taiwan hosts the leading-edge foundry base.',
        },
      ],
    },
    {
      ref: 'asml',
      name: 'ASML',
      kind: 'point',
      actorKey: 'ASML',
      citations: [
        {
          claim: 'relevance',
          url: 'https://example.test/asml',
          title: 'ASML lithography',
          quotedText: 'ASML is the sole EUV lithography supplier.',
        },
      ],
    },
  ],
  proposedFlows: [
    {
      fromRef: 'tsmc',
      toRef: 'taiwan',
      substitutability: 0.1,
      citations: [
        {
          claim: 'dependency',
          url: 'https://example.test/tsmc-taiwan',
          title: 'TSMC fabs in Taiwan',
          quotedText: 'TSMC concentrates leading-edge fabs in Taiwan.',
        },
      ],
    },
  ],
} as const

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
    env: { ADMIN_TOKEN, GENERATION_FAKE_SCRIPT: JSON.stringify(GENERATION_FIXTURE) },
  },
})
