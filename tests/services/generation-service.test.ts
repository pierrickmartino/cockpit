import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import type { Citation } from '@/domain/citation'
import type { GenerationResult, ProposedActor, ProposedFlow } from '@/domain/generation'
import { InMemoryStructureRepository } from '@/repositories/in-memory-structure-repository'
import { generateTurn } from '@/services/generation-service'
import {
  FakeGenerationModel,
  ThrowingGenerationModel,
} from '../generation/fake-generation-model'

const THEME_ID = randomUUID()

function citation(claim: Citation['claim']): Citation {
  return {
    claim,
    url: `https://example.test/${claim}`,
    title: `Source for ${claim}`,
    quotedText: `evidence for ${claim}`,
  }
}

function actor(overrides: Partial<ProposedActor> = {}): ProposedActor {
  return {
    ref: 'tsmc',
    name: 'TSMC',
    kind: 'point',
    actorKey: 'TSM',
    citations: [citation('relevance')],
    ...overrides,
  }
}

function flow(overrides: Partial<ProposedFlow> = {}): ProposedFlow {
  return {
    fromRef: 'apple',
    toRef: 'tsmc',
    substitutability: 0.1,
    citations: [citation('dependency')],
    ...overrides,
  }
}

function result(overrides: Partial<GenerationResult> = {}): GenerationResult {
  return { reply: 'Here is a proposal.', proposedActors: [], proposedFlows: [], ...overrides }
}

const messages = [{ role: 'admin' as const, text: 'Build the AI compute graph.' }]

describe('generateTurn', () => {
  it('persists surviving actors as proposed with their per-claim citations', async () => {
    const repo = new InMemoryStructureRepository()
    const model = new FakeGenerationModel(
      result({
        proposedActors: [
          actor({ tier: 'foundry', citations: [citation('relevance'), citation('tier')] }),
        ],
      }),
    )

    const turn = await generateTurn(repo, model, THEME_ID, { messages })

    expect(turn.status).toBe(200)
    expect(turn.body.data?.reply).toBe('Here is a proposal.')
    expect(turn.body.data?.report.addedActors).toEqual(['TSMC'])

    const [persisted] = await repo.listActors(THEME_ID)
    expect(persisted.status).toBe('proposed')
    expect(persisted.citations.map((c) => c.claim)).toEqual(['relevance', 'tier'])
  })

  it('feeds the model the current working structure', async () => {
    const repo = new InMemoryStructureRepository()
    await repo.addActor({ themeId: THEME_ID, name: 'Apple', kind: 'point', actorKey: 'AAPL' })
    const model = new FakeGenerationModel(result())

    await generateTurn(repo, model, THEME_ID, { messages })

    expect(model.lastRequest?.structure.actors.map((a) => a.actorKey)).toEqual(['AAPL'])
  })

  it('applies the grounding floor: drops an ungrounded actor and reports it', async () => {
    const repo = new InMemoryStructureRepository()
    const model = new FakeGenerationModel(
      result({
        proposedActors: [
          actor(),
          actor({ ref: 'x', name: 'Mystery', actorKey: 'MYS', citations: [] }),
        ],
      }),
    )

    const turn = await generateTurn(repo, model, THEME_ID, { messages })

    expect(await repo.listActors(THEME_ID)).toHaveLength(1)
    expect(turn.body.data?.report.droppedActors).toEqual([
      { ref: 'x', name: 'Mystery', reason: 'no citation for the relevance claim' },
    ])
  })

  it('resolves flow endpoints by ref and persists the flow against persisted UUIDs', async () => {
    const repo = new InMemoryStructureRepository()
    const model = new FakeGenerationModel(
      result({
        proposedActors: [
          actor({ ref: 'apple', name: 'Apple', actorKey: 'AAPL' }),
          actor({ ref: 'tsmc', name: 'TSMC', actorKey: 'TSM' }),
        ],
        proposedFlows: [flow()],
      }),
    )

    const turn = await generateTurn(repo, model, THEME_ID, { messages })

    const actors = await repo.listActors(THEME_ID)
    const apple = actors.find((a) => a.actorKey === 'AAPL')
    const tsmc = actors.find((a) => a.actorKey === 'TSM')
    const [persistedFlow] = await repo.listFlows(THEME_ID)

    expect(turn.body.data?.report.addedFlows).toBe(1)
    expect(persistedFlow.fromActorId).toBe(apple?.id)
    expect(persistedFlow.toActorId).toBe(tsmc?.id)
    expect(persistedFlow.status).toBe('proposed')
  })

  it('drops a flow whose endpoint will not resolve, persisting nothing for it', async () => {
    const repo = new InMemoryStructureRepository()
    const model = new FakeGenerationModel(
      result({
        proposedActors: [actor({ ref: 'apple', name: 'Apple', actorKey: 'AAPL' })],
        proposedFlows: [flow({ fromRef: 'apple', toRef: 'Foxconn' })],
      }),
    )

    const turn = await generateTurn(repo, model, THEME_ID, { messages })

    expect(await repo.listFlows(THEME_ID)).toHaveLength(0)
    expect(turn.body.data?.report.droppedFlows).toEqual([
      { fromRef: 'apple', toRef: 'Foxconn', reason: "endpoint 'Foxconn' not found" },
    ])
  })

  it('reuses an existing actor by actorKey rather than duplicating it', async () => {
    const repo = new InMemoryStructureRepository()
    const existing = await repo.addActor({
      themeId: THEME_ID,
      name: 'TSMC',
      kind: 'point',
      actorKey: 'TSM',
    })
    const model = new FakeGenerationModel(
      result({
        proposedActors: [
          actor({ ref: 'apple', name: 'Apple', actorKey: 'AAPL' }),
          actor({ ref: 'tsmc', name: 'TSMC', actorKey: 'TSM' }),
        ],
        proposedFlows: [flow({ fromRef: 'apple', toRef: 'tsmc' })],
      }),
    )

    const turn = await generateTurn(repo, model, THEME_ID, { messages })

    const tsmcActors = (await repo.listActors(THEME_ID)).filter((a) => a.actorKey === 'TSM')
    expect(tsmcActors).toHaveLength(1)
    expect(turn.body.data?.report.reusedActors).toEqual(['TSMC'])
    expect(turn.body.data?.report.addedActors).toEqual(['Apple'])

    // The flow's upstream endpoint resolves to the pre-existing TSMC UUID.
    const [persistedFlow] = await repo.listFlows(THEME_ID)
    expect(persistedFlow.toActorId).toBe(existing.id)
  })

  it('treats a dialogue-only turn as success that persists nothing', async () => {
    const repo = new InMemoryStructureRepository()
    const model = new FakeGenerationModel(result({ reply: 'Which region should we start with?' }))

    const turn = await generateTurn(repo, model, THEME_ID, { messages })

    expect(turn.status).toBe(200)
    expect(turn.body.data?.reply).toBe('Which region should we start with?')
    expect(turn.body.data?.proposals).toEqual({ actors: [], flows: [] })
    expect(await repo.listActors(THEME_ID)).toHaveLength(0)
    expect(await repo.listFlows(THEME_ID)).toHaveLength(0)
  })

  it('returns a retryable error and persists nothing when the model fails', async () => {
    const repo = new InMemoryStructureRepository()

    const turn = await generateTurn(repo, new ThrowingGenerationModel(), THEME_ID, { messages })

    expect(turn.status).toBe(502)
    expect(turn.body.success).toBe(false)
    expect(await repo.listActors(THEME_ID)).toHaveLength(0)
  })

  it('rejects a turn with no messages and persists nothing', async () => {
    const repo = new InMemoryStructureRepository()
    const model = new FakeGenerationModel(result({ proposedActors: [actor()] }))

    const turn = await generateTurn(repo, model, THEME_ID, { messages: [] })

    expect(turn.status).toBe(400)
    expect(turn.body.success).toBe(false)
    expect(await repo.listActors(THEME_ID)).toHaveLength(0)
  })
})
