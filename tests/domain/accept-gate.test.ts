import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import type { Actor } from '@/domain/actor'
import type { Flow } from '@/domain/flow'
import type { ReviewStatus } from '@/domain/review'
import type { WorkingStructure } from '@/domain/structure'
import { acceptedStructure, applyReview } from '@/domain/accept-gate'

const THEME_ID = randomUUID()

function actor(id: string, status: ReviewStatus = 'proposed'): Actor {
  return {
    id,
    themeId: THEME_ID,
    name: id,
    kind: 'point',
    actorKey: id,
    tier: null,
    location: null,
    status,
    citations: [],
    createdAt: new Date(),
  }
}

function flow(id: string, from: string, to: string, status: ReviewStatus = 'proposed'): Flow {
  return {
    id,
    themeId: THEME_ID,
    fromActorId: from,
    toActorId: to,
    substitutability: 0,
    status,
    citations: [],
    createdAt: new Date(),
  }
}

function structure(actors: Actor[], flows: Flow[]): WorkingStructure {
  return { actors, flows }
}

describe('applyReview', () => {
  it('accepts a proposed actor, moving it to accepted', () => {
    // Arrange
    const before = structure([actor('a')], [])

    // Act
    const after = applyReview(before, [{ target: 'actor', id: 'a', decision: 'accept' }])

    // Assert
    expect(after.actors[0].status).toBe('accepted')
  })

  it('rejects a proposed flow, moving it to rejected', () => {
    // Arrange
    const before = structure([actor('a'), actor('b')], [flow('f', 'a', 'b')])

    // Act
    const after = applyReview(before, [{ target: 'flow', id: 'f', decision: 'reject' }])

    // Assert
    expect(after.flows[0].status).toBe('rejected')
  })

  it('applies each decision to its own target in a mixed batch', () => {
    // Arrange: two actors and a flow, all proposed.
    const before = structure([actor('a'), actor('b')], [flow('f', 'a', 'b')])

    // Act: accept one actor, reject the other, accept the flow — in one batch.
    const after = applyReview(before, [
      { target: 'actor', id: 'a', decision: 'accept' },
      { target: 'actor', id: 'b', decision: 'reject' },
      { target: 'flow', id: 'f', decision: 'accept' },
    ])

    // Assert
    expect(after.actors.find((a) => a.id === 'a')?.status).toBe('accepted')
    expect(after.actors.find((a) => a.id === 'b')?.status).toBe('rejected')
    expect(after.flows[0].status).toBe('accepted')
  })

  it('is idempotent: re-applying a batch leaves an already-reviewed element unchanged', () => {
    // Arrange
    const before = structure([actor('a')], [])
    const actions: Parameters<typeof applyReview>[1] = [
      { target: 'actor', id: 'a', decision: 'accept' },
    ]

    // Act: apply twice.
    const once = applyReview(before, actions)
    const twice = applyReview(once, actions)

    // Assert: stable after the first decision.
    expect(once.actors[0].status).toBe('accepted')
    expect(twice.actors[0].status).toBe('accepted')
  })

  it('does not re-review a decided element (reject after accept is a no-op)', () => {
    // Arrange: an already-accepted actor.
    const before = structure([actor('a', 'accepted')], [])

    // Act
    const after = applyReview(before, [{ target: 'actor', id: 'a', decision: 'reject' }])

    // Assert: the gate is one-way; the prior decision stands.
    expect(after.actors[0].status).toBe('accepted')
  })

  it('ignores a decision naming an unknown element', () => {
    // Arrange
    const before = structure([actor('a')], [])

    // Act
    const after = applyReview(before, [{ target: 'actor', id: 'ghost', decision: 'accept' }])

    // Assert: the real actor is untouched, no phantom element appears.
    expect(after.actors).toHaveLength(1)
    expect(after.actors[0].status).toBe('proposed')
  })

  it('does not mutate the input structure or its elements', () => {
    // Arrange
    const original = actor('a')
    const before = structure([original], [])

    // Act
    applyReview(before, [{ target: 'actor', id: 'a', decision: 'accept' }])

    // Assert: the caller's data is unchanged (immutability rule).
    expect(original.status).toBe('proposed')
    expect(before.actors[0].status).toBe('proposed')
  })
})

describe('acceptedStructure', () => {
  it('keeps only accepted actors', () => {
    // Arrange
    const before = structure(
      [actor('keep', 'accepted'), actor('drop', 'rejected'), actor('pending', 'proposed')],
      [],
    )

    // Act
    const accepted = acceptedStructure(before)

    // Assert
    expect(accepted.actors.map((a) => a.id)).toEqual(['keep'])
  })

  it('keeps an accepted flow only when both endpoints are accepted', () => {
    // Arrange: flow f connects two accepted actors; flow g points at a rejected one.
    const before = structure(
      [actor('a', 'accepted'), actor('b', 'accepted'), actor('c', 'rejected')],
      [flow('f', 'a', 'b', 'accepted'), flow('g', 'a', 'c', 'accepted')],
    )

    // Act
    const accepted = acceptedStructure(before)

    // Assert: g is dropped so the preview never dangles to a non-accepted actor.
    expect(accepted.flows.map((flow) => flow.id)).toEqual(['f'])
  })

  it('drops a proposed flow even between accepted actors', () => {
    // Arrange
    const before = structure(
      [actor('a', 'accepted'), actor('b', 'accepted')],
      [flow('f', 'a', 'b', 'proposed')],
    )

    // Act
    const accepted = acceptedStructure(before)

    // Assert
    expect(accepted.flows).toHaveLength(0)
  })
})
