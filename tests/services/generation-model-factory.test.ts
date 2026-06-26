import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GenerationResult } from '@/domain/generation'
import {
  GenerationNotConfiguredError,
  getGenerationModel,
} from '@/services/generation-model-factory'

const ENV_KEY = 'GENERATION_FAKE_SCRIPT'

let previous: string | undefined

beforeEach(() => {
  previous = process.env[ENV_KEY]
  delete process.env[ENV_KEY]
})

afterEach(() => {
  if (previous === undefined) {
    delete process.env[ENV_KEY]
  } else {
    process.env[ENV_KEY] = previous
  }
})

describe('getGenerationModel', () => {
  it('fails closed when no adapter is configured', () => {
    expect(() => getGenerationModel()).toThrow(GenerationNotConfiguredError)
  })

  it('replays the fixture in GENERATION_FAKE_SCRIPT as a generation model', async () => {
    const fixture: GenerationResult = {
      reply: 'Proposed TSMC.',
      proposedActors: [
        {
          ref: 'tsmc',
          name: 'TSMC',
          kind: 'point',
          actorKey: 'TSM',
          citations: [
            {
              claim: 'relevance',
              url: 'https://example.test/tsmc',
              title: 'TSMC',
              quotedText: 'central to AI compute',
            },
          ],
        },
      ],
      proposedFlows: [],
    }
    process.env[ENV_KEY] = JSON.stringify(fixture)

    const model = getGenerationModel()
    const result = await model.generate({
      themeId: 't',
      messages: [{ role: 'admin', text: 'hi' }],
      structure: { actors: [], flows: [] },
    })

    expect(result).toEqual(fixture)
  })
})
