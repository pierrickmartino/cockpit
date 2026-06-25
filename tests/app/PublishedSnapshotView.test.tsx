import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SnapshotContent } from '@/domain/snapshot'
import { PublishedSnapshotView } from '@/app/view/[id]/PublishedSnapshotView'

function content(): SnapshotContent {
  return {
    actors: [
      { id: 'tsmc', name: 'TSMC', kind: 'point', actorKey: 'TSM', tier: 'foundry', location: null },
      { id: 'apple', name: 'Apple', kind: 'point', actorKey: 'AAPL', tier: null, location: null },
    ],
    flows: [{ id: 'f', fromActorId: 'apple', toActorId: 'tsmc', substitutability: 0.1 }],
    power: {
      tsmc: { raw: 0.9, normalized: 1 },
      apple: { raw: 0, normalized: 0 },
    },
    citations: [],
    bindings: [],
  }
}

describe('PublishedSnapshotView', () => {
  it('renders the published actors', () => {
    render(<PublishedSnapshotView content={content()} />)

    const actors = screen.getAllByTestId('published-actor-item')
    expect(actors).toHaveLength(2)
    expect(actors[0]).toHaveTextContent('TSMC')
  })

  it('renders the published flows with their endpoints by name', () => {
    render(<PublishedSnapshotView content={content()} />)

    const flow = screen.getByTestId('published-flow-item')
    expect(flow).toHaveTextContent('Apple → TSMC')
  })

  it('ranks actors by power, strongest chokepoint first', () => {
    render(<PublishedSnapshotView content={content()} />)

    const ranking = screen.getAllByTestId('published-power-item')
    expect(ranking[0]).toHaveTextContent('TSMC')
    expect(ranking[0]).toHaveTextContent('100%')
  })
})
