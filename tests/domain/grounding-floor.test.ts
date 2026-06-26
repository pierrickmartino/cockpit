import { describe, expect, it } from 'vitest'
import type { Citation } from '@/domain/citation'
import type { ProposedActor, ProposedFlow } from '@/domain/generation'
import { applyActorGroundingFloor, applyFlowGroundingFloor } from '@/domain/grounding-floor'

function citation(claim: Citation['claim']): Citation {
  return {
    claim,
    url: `https://example.test/${claim}`,
    title: `Source for ${claim}`,
    quotedText: `evidence for ${claim}`,
  }
}

function proposedActor(overrides: Partial<ProposedActor> = {}): ProposedActor {
  return {
    ref: 'a1',
    name: 'TSMC',
    kind: 'point',
    actorKey: 'TSM',
    citations: [citation('relevance')],
    ...overrides,
  }
}

function proposedFlow(overrides: Partial<ProposedFlow> = {}): ProposedFlow {
  return {
    fromRef: 'a1',
    toRef: 'a2',
    substitutability: 0.2,
    citations: [citation('dependency')],
    ...overrides,
  }
}

describe('applyActorGroundingFloor', () => {
  it('keeps an actor whose relevance claim is cited', () => {
    const { surviving, dropped } = applyActorGroundingFloor([proposedActor()])

    expect(surviving).toHaveLength(1)
    expect(dropped).toHaveLength(0)
  })

  it('drops an actor with no citation on its relevance claim', () => {
    const ungrounded = proposedActor({ name: 'Foxconn', citations: [] })

    const { surviving, dropped } = applyActorGroundingFloor([ungrounded])

    expect(surviving).toHaveLength(0)
    expect(dropped).toEqual([
      { ref: 'a1', name: 'Foxconn', reason: 'no citation for the relevance claim' },
    ])
  })

  it('drops an actor citing only a secondary claim, not relevance', () => {
    const onlyTier = proposedActor({ citations: [citation('tier')] })

    const { surviving, dropped } = applyActorGroundingFloor([onlyTier])

    expect(surviving).toHaveLength(0)
    expect(dropped).toHaveLength(1)
  })

  it('keeps a relevance-cited actor whose tier/location are unsourced (flag is derived)', () => {
    const partlySourced = proposedActor({
      tier: 'foundry',
      location: 'Hsinchu',
      citations: [citation('relevance')],
    })

    const { surviving } = applyActorGroundingFloor([partlySourced])

    expect(surviving).toHaveLength(1)
    expect(surviving[0].citations.some((c) => c.claim === 'tier')).toBe(false)
  })
})

describe('applyFlowGroundingFloor', () => {
  it('keeps a flow whose dependency claim is cited', () => {
    const { surviving, dropped } = applyFlowGroundingFloor([proposedFlow()])

    expect(surviving).toHaveLength(1)
    expect(dropped).toHaveLength(0)
  })

  it('drops a flow with no citation on its dependency claim', () => {
    const ungrounded = proposedFlow({ citations: [citation('substitutability')] })

    const { surviving, dropped } = applyFlowGroundingFloor([ungrounded])

    expect(surviving).toHaveLength(0)
    expect(dropped).toEqual([
      { fromRef: 'a1', toRef: 'a2', reason: 'no citation for the dependency claim' },
    ])
  })
})
