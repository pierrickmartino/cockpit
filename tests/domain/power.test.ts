import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import type { Actor } from '@/domain/actor'
import type { Flow } from '@/domain/flow'
import type { WorkingStructure } from '@/domain/structure'
import { computePower, normalizePower } from '@/domain/power'

const THEME_ID = randomUUID()

function actor(id: string): Actor {
  return {
    id,
    themeId: THEME_ID,
    name: id,
    kind: 'point',
    actorKey: id,
    tier: null,
    location: null,
    status: 'accepted',
    citations: [],
    createdAt: new Date(),
  }
}

/** A dependency flow: `from` depends on `to`, replaceable per `substitutability`. */
function flow(from: string, to: string, substitutability: number): Flow {
  return {
    id: randomUUID(),
    themeId: THEME_ID,
    fromActorId: from,
    toActorId: to,
    substitutability,
    status: 'accepted',
    citations: [],
    createdAt: new Date(),
  }
}

function structure(actors: Actor[], flows: Flow[]): WorkingStructure {
  return { actors, flows }
}

describe('computePower', () => {
  it('credits the depended-upon actor with a sole-source dependency', () => {
    // Arrange: Apple depends on TSMC with no substitute (substitutability 0).
    const graph = structure(
      [actor('apple'), actor('tsmc')],
      [flow('apple', 'tsmc', 0)],
    )

    // Act
    const power = computePower(graph)

    // Assert: power accrues to the actor the flow points at.
    expect(power.tsmc).toBe(1)
    expect(power.apple).toBe(0)
  })

  it('ranks a less-substitutable supplier above a more-substitutable one with equal dependents', () => {
    // Arrange: two suppliers, one dependent each; only substitutability differs.
    const graph = structure(
      [actor('scarce'), actor('common'), actor('buyerA'), actor('buyerB')],
      [flow('buyerA', 'scarce', 0.1), flow('buyerB', 'common', 0.9)],
    )

    // Act
    const power = computePower(graph)

    // Assert
    expect(power.scarce).toBeGreaterThan(power.common)
    expect(power.scarce).toBeCloseTo(0.9)
    expect(power.common).toBeCloseTo(0.1)
  })

  it('sums parallel flows onto the same supplier', () => {
    // Arrange: two separately-authored dependencies on the same supplier.
    const graph = structure(
      [actor('supplier'), actor('buyerA'), actor('buyerB')],
      [flow('buyerA', 'supplier', 0.25), flow('buyerB', 'supplier', 0.5)],
    )

    // Act
    const power = computePower(graph)

    // Assert: 0.75 + 0.5
    expect(power.supplier).toBeCloseTo(1.25)
  })

  it('ranks the actor that the most actors critically depend on highest', () => {
    // Arrange: a chokepoint with three hard dependents vs a minor supplier.
    const graph = structure(
      [actor('choke'), actor('minor'), actor('d1'), actor('d2'), actor('d3')],
      [
        flow('d1', 'choke', 0),
        flow('d2', 'choke', 0),
        flow('d3', 'choke', 0),
        flow('d1', 'minor', 0),
      ],
    )

    // Act
    const power = computePower(graph)

    // Assert
    expect(power.choke).toBe(3)
    expect(power.minor).toBe(1)
    expect(power.choke).toBeGreaterThan(power.minor)
  })

  it('scores an actor with no incoming flows as zero', () => {
    // Arrange: `island` depends on no one and nothing depends on it.
    const graph = structure(
      [actor('supplier'), actor('buyer'), actor('island')],
      [flow('buyer', 'supplier', 0)],
    )

    // Act
    const power = computePower(graph)

    // Assert
    expect(power.island).toBe(0)
  })

  it('scores every actor zero when the graph has no flows', () => {
    // Arrange
    const graph = structure([actor('a'), actor('b'), actor('c')], [])

    // Act
    const power = computePower(graph)

    // Assert: total over the actor set, all zero — and no missing keys.
    expect(power).toEqual({ a: 0, b: 0, c: 0 })
  })

  it('does not propagate power transitively (documented v1 limitation, ADR-0018)', () => {
    // Arrange: three buyers depend on TSMC; TSMC alone depends on ASML. ASML is
    // the deepest structural chokepoint — everything ultimately rests on it.
    const graph = structure(
      [actor('asml'), actor('tsmc'), actor('b1'), actor('b2'), actor('b3')],
      [
        flow('b1', 'tsmc', 0),
        flow('b2', 'tsmc', 0),
        flow('b3', 'tsmc', 0),
        flow('tsmc', 'asml', 0),
      ],
    )

    // Act
    const power = computePower(graph)

    // Assert: the local metric scores each actor by direct incoming dependence
    // only. TSMC has three dependents (3); ASML has one (TSMC → 1). So ASML —
    // the second-order chokepoint — is *under*-ranked relative to TSMC. This is
    // the deliberate v1 trade-off; a propagating metric (deferred, see
    // docs/exploratory.md) would boost ASML above TSMC.
    expect(power.tsmc).toBe(3)
    expect(power.asml).toBe(1)
    expect(power.asml).toBeLessThan(power.tsmc)
  })
})

describe('normalizePower', () => {
  it('scales the highest score to 1 and the rest proportionally', () => {
    // Arrange
    const raw = { a: 4, b: 2, c: 0 }

    // Act
    const normalized = normalizePower(raw)

    // Assert
    expect(normalized.a).toBe(1)
    expect(normalized.b).toBe(0.5)
    expect(normalized.c).toBe(0)
  })

  it('returns all zeros when every score is zero, without dividing by zero', () => {
    // Arrange
    const raw = { a: 0, b: 0, c: 0 }

    // Act
    const normalized = normalizePower(raw)

    // Assert
    expect(normalized).toEqual({ a: 0, b: 0, c: 0 })
  })
})
