import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReviewQueue } from '@/app/admin/ReviewQueue'
import type { Actor } from '@/domain/actor'
import type { Flow } from '@/domain/flow'
import type { ReviewStatus } from '@/domain/review'

const THEME_ID = '00000000-0000-0000-0000-000000000000'

function actor(id: string, name: string, status: ReviewStatus): Actor {
  return {
    id,
    themeId: THEME_ID,
    name,
    kind: 'point',
    actorKey: id,
    tier: null,
    location: null,
    status,
    createdAt: new Date(),
  }
}

function flow(id: string, from: string, to: string, status: ReviewStatus): Flow {
  return {
    id,
    themeId: THEME_ID,
    fromActorId: from,
    toActorId: to,
    substitutability: 0,
    status,
    createdAt: new Date(),
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
})
