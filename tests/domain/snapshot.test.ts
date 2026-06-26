import { describe, expect, it } from 'vitest'
import type { Actor } from '@/domain/actor'
import type { Citation } from '@/domain/citation'
import type { Flow } from '@/domain/flow'
import type { ReviewStatus } from '@/domain/review'
import type { WorkingStructure } from '@/domain/structure'
import { buildSnapshot } from '@/domain/snapshot'

function actor(id: string, status: ReviewStatus, overrides: Partial<Actor> = {}): Actor {
  return {
    id,
    themeId: 'theme-1',
    name: id.toUpperCase(),
    kind: 'point',
    actorKey: id.toUpperCase(),
    tier: null,
    location: null,
    status,
    citations: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

function flow(id: string, fromActorId: string, toActorId: string, status: ReviewStatus): Flow {
  return {
    id,
    themeId: 'theme-1',
    fromActorId,
    toActorId,
    substitutability: 0,
    status,
    citations: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
  }
}

describe('buildSnapshot', () => {
  it('freezes only accepted actors, dropping proposed and rejected ones', () => {
    const structure: WorkingStructure = {
      actors: [
        actor('a', 'accepted'),
        actor('b', 'proposed'),
        actor('c', 'rejected'),
      ],
      flows: [],
    }

    const snapshot = buildSnapshot(structure)

    expect(snapshot.actors.map((a) => a.id)).toEqual(['a'])
  })

  it('freezes structural fields and drops authoring-state fields', () => {
    const structure: WorkingStructure = {
      actors: [
        actor('tsmc', 'accepted', {
          name: 'TSMC',
          kind: 'point',
          actorKey: 'TSM',
          tier: 'foundry',
          location: 'Hsinchu, TW',
        }),
      ],
      flows: [],
    }

    const snapshot = buildSnapshot(structure)

    // Static fields are frozen…
    expect(snapshot.actors[0]).toEqual({
      id: 'tsmc',
      name: 'TSMC',
      kind: 'point',
      actorKey: 'TSM',
      tier: 'foundry',
      location: 'Hsinchu, TW',
    })
    // …and authoring-state fields never leak into the frozen snapshot.
    expect(snapshot.actors[0]).not.toHaveProperty('status')
    expect(snapshot.actors[0]).not.toHaveProperty('themeId')
    expect(snapshot.actors[0]).not.toHaveProperty('createdAt')
  })

  it('keeps an accepted flow only when both endpoints are accepted', () => {
    const structure: WorkingStructure = {
      actors: [actor('a', 'accepted'), actor('b', 'accepted'), actor('c', 'proposed')],
      flows: [
        flow('ab', 'a', 'b', 'accepted'), // both endpoints accepted → kept
        flow('ac', 'a', 'c', 'accepted'), // endpoint c not accepted → dropped
        flow('ba', 'b', 'a', 'proposed'), // flow not accepted → dropped
      ],
    }

    const snapshot = buildSnapshot(structure)

    expect(snapshot.flows.map((f) => f.id)).toEqual(['ab'])
    expect(snapshot.flows[0]).toEqual({
      id: 'ab',
      fromActorId: 'a',
      toActorId: 'b',
      substitutability: 0,
    })
  })

  it('freezes computed power (raw + normalized) over the accepted subgraph', () => {
    const structure: WorkingStructure = {
      actors: [actor('apple', 'accepted'), actor('tsmc', 'accepted')],
      flows: [
        // Apple depends on TSMC with no substitute → all power accrues to TSMC.
        { ...flow('f', 'apple', 'tsmc', 'accepted'), substitutability: 0 },
      ],
    }

    const snapshot = buildSnapshot(structure)

    expect(snapshot.power.tsmc).toEqual({ raw: 1, normalized: 1 })
    expect(snapshot.power.apple).toEqual({ raw: 0, normalized: 0 })
  })

  it('emits empty citations and bindings placeholders when nothing is sourced', () => {
    const snapshot = buildSnapshot({ actors: [actor('a', 'accepted')], flows: [] })

    expect(snapshot.citations).toEqual([])
    expect(snapshot.bindings).toEqual([])
  })

  it('freezes citations from accepted actors and flows, tagged with their owning element', () => {
    const relevance: Citation = {
      claim: 'relevance',
      url: 'https://example.com/tsmc',
      title: 'TSMC leads leading-edge foundry',
      quotedText: 'TSMC makes the majority of the world’s most advanced chips.',
    }
    const dependency: Citation = {
      claim: 'dependency',
      url: 'https://example.com/apple-tsmc',
      title: 'Apple depends on TSMC',
      quotedText: 'Apple sources its silicon exclusively from TSMC.',
    }

    const structure: WorkingStructure = {
      actors: [
        actor('apple', 'accepted'),
        actor('tsmc', 'accepted', { citations: [relevance] }),
      ],
      flows: [{ ...flow('f', 'apple', 'tsmc', 'accepted'), citations: [dependency] }],
    }

    const snapshot = buildSnapshot(structure)

    expect(snapshot.citations).toEqual([
      { target: 'actor', elementId: 'tsmc', ...relevance },
      { target: 'flow', elementId: 'f', ...dependency },
    ])
  })

  it('excludes citations of proposed and rejected elements from the snapshot', () => {
    const proposed: Citation = {
      claim: 'relevance',
      url: 'https://example.com/proposed',
      title: 'Unaccepted source',
      quotedText: 'This actor is only proposed.',
    }

    const structure: WorkingStructure = {
      actors: [
        actor('accepted-actor', 'accepted'),
        actor('proposed-actor', 'proposed', { citations: [proposed] }),
      ],
      flows: [],
    }

    const snapshot = buildSnapshot(structure)

    expect(snapshot.citations).toEqual([])
  })
})
