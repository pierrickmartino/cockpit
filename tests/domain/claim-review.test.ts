import { describe, expect, it } from 'vitest'
import type { Actor } from '@/domain/actor'
import type { Citation } from '@/domain/citation'
import type { Flow } from '@/domain/flow'
import { reviewClaimsForActor, reviewClaimsForFlow } from '@/domain/claim-review'

const THEME_ID = '00000000-0000-0000-0000-000000000000'

function citation(claim: Citation['claim'], quotedText = `snippet for ${claim}`): Citation {
  return { claim, url: `https://example.test/${claim}`, title: `Source: ${claim}`, quotedText }
}

function actor(overrides: Partial<Actor> = {}): Actor {
  return {
    id: 'a',
    themeId: THEME_ID,
    name: 'TSMC',
    kind: 'point',
    actorKey: 'TSM',
    tier: null,
    location: null,
    status: 'proposed',
    citations: [],
    createdAt: new Date(),
    ...overrides,
  }
}

function flow(overrides: Partial<Flow> = {}): Flow {
  return {
    id: 'f',
    themeId: THEME_ID,
    fromActorId: 'a',
    toActorId: 'b',
    substitutability: 0.2,
    status: 'proposed',
    citations: [],
    createdAt: new Date(),
    ...overrides,
  }
}

describe('reviewClaimsForActor', () => {
  it('returns only the relevance group when no tier or location is asserted', () => {
    const groups = reviewClaimsForActor(actor({ citations: [citation('relevance')] }))

    expect(groups.map((group) => group.claim)).toEqual(['relevance'])
    expect(groups[0].citations).toHaveLength(1)
    expect(groups[0].unsourced).toBe(false)
  })

  it('flags an asserted tier with no citation as unsourced', () => {
    const groups = reviewClaimsForActor(
      actor({ tier: 'foundry', citations: [citation('relevance')] }),
    )

    const tier = groups.find((group) => group.claim === 'tier')
    expect(tier).toBeDefined()
    expect(tier?.citations).toHaveLength(0)
    expect(tier?.unsourced).toBe(true)
  })

  it('does not flag a tier that carries its own citation', () => {
    const groups = reviewClaimsForActor(
      actor({ tier: 'foundry', citations: [citation('relevance'), citation('tier')] }),
    )

    const tier = groups.find((group) => group.claim === 'tier')
    expect(tier?.citations).toHaveLength(1)
    expect(tier?.unsourced).toBe(false)
  })

  it('includes a location group only when a location is asserted', () => {
    const without = reviewClaimsForActor(actor({ citations: [citation('relevance')] }))
    expect(without.some((group) => group.claim === 'location')).toBe(false)

    const withLocation = reviewClaimsForActor(
      actor({ location: 'Hsinchu', citations: [citation('relevance')] }),
    )
    const location = withLocation.find((group) => group.claim === 'location')
    expect(location?.unsourced).toBe(true)
  })

  it('never flags the relevance existence claim as unsourced', () => {
    const groups = reviewClaimsForActor(actor({ citations: [citation('relevance')] }))
    expect(groups.find((group) => group.claim === 'relevance')?.unsourced).toBe(false)
  })

  it('groups every citation under the claim it backs', () => {
    const groups = reviewClaimsForActor(
      actor({
        tier: 'foundry',
        citations: [citation('relevance', 'first'), citation('relevance', 'second'), citation('tier')],
      }),
    )
    expect(groups.find((group) => group.claim === 'relevance')?.citations).toHaveLength(2)
    expect(groups.find((group) => group.claim === 'tier')?.citations).toHaveLength(1)
  })
})

describe('reviewClaimsForFlow', () => {
  it('flags substitutability as unsourced when only the dependency claim is cited', () => {
    const groups = reviewClaimsForFlow(flow({ citations: [citation('dependency')] }))

    expect(groups.map((group) => group.claim)).toEqual(['dependency', 'substitutability'])
    expect(groups.find((group) => group.claim === 'dependency')?.unsourced).toBe(false)
    expect(groups.find((group) => group.claim === 'substitutability')?.unsourced).toBe(true)
  })

  it('does not flag substitutability that carries its own citation', () => {
    const groups = reviewClaimsForFlow(
      flow({ citations: [citation('dependency'), citation('substitutability')] }),
    )
    expect(groups.find((group) => group.claim === 'substitutability')?.unsourced).toBe(false)
  })
})
