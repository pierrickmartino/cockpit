import { describe, expect, it } from 'vitest'
import type { Citation } from '@/domain/citation'
import type { ProposedFlow } from '@/domain/generation'
import { resolveEndpoints } from '@/domain/endpoint-resolution'

const dependencyCitation: Citation = {
  claim: 'dependency',
  url: 'https://example.test/dependency',
  title: 'Dependency source',
  quotedText: 'X depends on Y',
}

function flow(fromRef: string, toRef: string): ProposedFlow {
  return { fromRef, toRef, substitutability: 0.3, citations: [dependencyCitation] }
}

describe('resolveEndpoints', () => {
  it('maps name/temp-id refs to persisted actor UUIDs', () => {
    const map = new Map([
      ['Apple', 'uuid-apple'],
      ['TSMC', 'uuid-tsmc'],
    ])

    const { resolved, dropped } = resolveEndpoints([flow('Apple', 'TSMC')], map)

    expect(dropped).toHaveLength(0)
    expect(resolved).toEqual([
      {
        fromActorId: 'uuid-apple',
        toActorId: 'uuid-tsmc',
        substitutability: 0.3,
        citations: [dependencyCitation],
      },
    ])
  })

  it('drops a flow whose endpoint will not resolve, naming the missing ref', () => {
    const map = new Map([['Apple', 'uuid-apple']])

    const { resolved, dropped } = resolveEndpoints([flow('Apple', 'Foxconn')], map)

    expect(resolved).toHaveLength(0)
    expect(dropped).toEqual([
      { fromRef: 'Apple', toRef: 'Foxconn', reason: "endpoint 'Foxconn' not found" },
    ])
  })

  it('drops a flow whose endpoints resolve to the same actor', () => {
    const map = new Map([['Apple', 'uuid-apple']])

    const { resolved, dropped } = resolveEndpoints([flow('Apple', 'Apple')], map)

    expect(resolved).toHaveLength(0)
    expect(dropped[0].reason).toBe('flow endpoints resolve to the same actor')
  })

  it('resolves the resolvable flows and drops the rest in one pass', () => {
    const map = new Map([
      ['Apple', 'uuid-apple'],
      ['TSMC', 'uuid-tsmc'],
    ])

    const { resolved, dropped } = resolveEndpoints(
      [flow('Apple', 'TSMC'), flow('Apple', 'Unknown')],
      map,
    )

    expect(resolved).toHaveLength(1)
    expect(dropped).toHaveLength(1)
  })
})
