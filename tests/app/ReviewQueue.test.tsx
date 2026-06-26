import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReviewQueue } from '@/app/admin/ReviewQueue'
import type { Actor } from '@/domain/actor'
import type { Citation } from '@/domain/citation'
import type { Flow } from '@/domain/flow'
import type { ReviewStatus } from '@/domain/review'

const THEME_ID = '00000000-0000-0000-0000-000000000000'

function citation(claim: Citation['claim'], quotedText: string): Citation {
  return { claim, url: `https://example.test/${claim}`, title: `Source ${claim}`, quotedText }
}

function actor(
  id: string,
  name: string,
  status: ReviewStatus,
  overrides: Partial<Actor> = {},
): Actor {
  return {
    id,
    themeId: THEME_ID,
    name,
    kind: 'point',
    actorKey: id,
    tier: null,
    location: null,
    status,
    citations: [],
    createdAt: new Date(),
    ...overrides,
  }
}

function flow(
  id: string,
  from: string,
  to: string,
  status: ReviewStatus,
  overrides: Partial<Flow> = {},
): Flow {
  return {
    id,
    themeId: THEME_ID,
    fromActorId: from,
    toActorId: to,
    substitutability: 0,
    status,
    citations: [],
    createdAt: new Date(),
    ...overrides,
  }
}

describe('ReviewQueue', () => {
  it('lists only proposed actors and flows', () => {
    const actors = [
      actor('a', 'Proposed Co', 'proposed'),
      actor('b', 'Accepted Co', 'accepted'),
      actor('c', 'Rejected Co', 'rejected'),
    ]
    const flows = [flow('f', 'a', 'b', 'proposed'), flow('g', 'a', 'b', 'accepted')]

    render(<ReviewQueue actors={actors} flows={flows} onReview={vi.fn()} />)

    const actorItems = screen.getAllByTestId('review-actor-item')
    expect(actorItems).toHaveLength(1)
    expect(actorItems[0]).toHaveTextContent('Proposed Co')

    const flowItems = screen.getAllByTestId('review-flow-item')
    expect(flowItems).toHaveLength(1)
  })

  it('shows nothing-to-review messaging when no element is proposed', () => {
    render(
      <ReviewQueue actors={[actor('b', 'Accepted Co', 'accepted')]} flows={[]} onReview={vi.fn()} />,
    )

    expect(screen.queryByTestId('review-actor-item')).toBeNull()
    expect(screen.getByTestId('review-empty')).toBeInTheDocument()
  })

  it('invokes onReview with an accept action when Accept is clicked', () => {
    const onReview = vi.fn()
    render(
      <ReviewQueue actors={[actor('a', 'Proposed Co', 'proposed')]} flows={[]} onReview={onReview} />,
    )

    const item = screen.getByTestId('review-actor-item')
    fireEvent.click(within(item).getByRole('button', { name: 'Accept' }))

    expect(onReview).toHaveBeenCalledWith({ target: 'actor', id: 'a', decision: 'accept' })
  })

  it('invokes onReview with a reject action for a proposed flow', () => {
    const onReview = vi.fn()
    const actors = [actor('a', 'A', 'accepted'), actor('b', 'B', 'accepted')]
    render(<ReviewQueue actors={actors} flows={[flow('f', 'a', 'b', 'proposed')]} onReview={onReview} />)

    const item = screen.getByTestId('review-flow-item')
    fireEvent.click(within(item).getByRole('button', { name: 'Reject' }))

    expect(onReview).toHaveBeenCalledWith({ target: 'flow', id: 'f', decision: 'reject' })
  })

  it("shows an actor's citations grouped by claim, with the retrieved snippet", () => {
    const proposed = actor('a', 'Proposed Co', 'proposed', {
      tier: 'foundry',
      citations: [
        citation('relevance', 'central to AI compute'),
        citation('tier', 'a leading-edge foundry'),
      ],
    })

    render(<ReviewQueue actors={[proposed]} flows={[]} onReview={vi.fn()} />)

    const item = screen.getByTestId('review-actor-item')
    const relevance = within(item).getByTestId('claim-group-relevance')
    expect(relevance).toHaveTextContent('relevance')
    expect(relevance).toHaveTextContent('central to AI compute')

    const tier = within(item).getByTestId('claim-group-tier')
    expect(tier).toHaveTextContent('a leading-edge foundry')
    expect(within(tier).queryByTestId('unsourced-flag')).toBeNull()
  })

  it('flags an asserted tier with no citation as unsourced', () => {
    const proposed = actor('a', 'Proposed Co', 'proposed', {
      tier: 'foundry',
      citations: [citation('relevance', 'central to AI compute')],
    })

    render(<ReviewQueue actors={[proposed]} flows={[]} onReview={vi.fn()} />)

    const tier = within(screen.getByTestId('review-actor-item')).getByTestId('claim-group-tier')
    expect(within(tier).getByTestId('unsourced-flag')).toBeInTheDocument()
  })

  it('flags a flow substitutability with no citation as unsourced', () => {
    const actors = [actor('a', 'A', 'accepted'), actor('b', 'B', 'accepted')]
    const proposed = flow('f', 'a', 'b', 'proposed', {
      citations: [citation('dependency', 'A relies on B')],
    })

    render(<ReviewQueue actors={actors} flows={[proposed]} onReview={vi.fn()} />)

    const item = screen.getByTestId('review-flow-item')
    expect(within(item).getByTestId('claim-group-dependency')).toHaveTextContent('A relies on B')
    const substitutability = within(item).getByTestId('claim-group-substitutability')
    expect(within(substitutability).getByTestId('unsourced-flag')).toBeInTheDocument()
  })
})
