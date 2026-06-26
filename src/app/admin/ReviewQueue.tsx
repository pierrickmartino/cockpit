import type { ReviewAction } from '@/domain/accept-gate'
import type { Actor } from '@/domain/actor'
import { reviewClaimsForActor, reviewClaimsForFlow, type ClaimGroup } from '@/domain/claim-review'
import type { Flow } from '@/domain/flow'

interface ReviewQueueProps {
  actors: Actor[]
  flows: Flow[]
  onReview: (action: ReviewAction) => void | Promise<void>
}

/**
 * The Admin's accept-gate review surface: the queue of `proposed` actors and
 * flows awaiting a decision (CONTEXT.md "Workbench"). Each proposal shows its
 * citations grouped by the claim they ground, and any secondary claim lacking a
 * citation is flagged as unsourced (ADR-0015, ADR-0021) so the Admin can review
 * grounding before accepting. Accepting or rejecting an element raises a
 * {@link ReviewAction}; only accepted elements reach the accepted-only preview.
 */
export function ReviewQueue({ actors, flows, onReview }: ReviewQueueProps) {
  const proposedActors = actors.filter((actor) => actor.status === 'proposed')
  const proposedFlows = flows.filter((flow) => flow.status === 'proposed')
  const actorName = (id: string) => actors.find((actor) => actor.id === id)?.name ?? id

  const nothingToReview = proposedActors.length === 0 && proposedFlows.length === 0

  return (
    <section data-testid="review-queue">
      <h3>Review queue</h3>

      {nothingToReview && <p data-testid="review-empty">No proposals awaiting review.</p>}

      {proposedActors.length > 0 && (
        <ul data-testid="review-actors">
          {proposedActors.map((actor) => (
            <li key={actor.id} data-testid="review-actor-item">
              {actor.name} ({actor.kind})
              <ReviewButtons target="actor" id={actor.id} onReview={onReview} />
              <ClaimGroups groups={reviewClaimsForActor(actor)} />
            </li>
          ))}
        </ul>
      )}

      {proposedFlows.length > 0 && (
        <ul data-testid="review-flows">
          {proposedFlows.map((flow) => (
            <li key={flow.id} data-testid="review-flow-item">
              {actorName(flow.fromActorId)} → {actorName(flow.toActorId)} (substitutability{' '}
              {flow.substitutability})
              <ReviewButtons target="flow" id={flow.id} onReview={onReview} />
              <ClaimGroups groups={reviewClaimsForFlow(flow)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Renders an element's per-claim grounding: each claim with its retrieved
 * snippets, and an unsourced flag where a secondary claim carries no citation.
 */
function ClaimGroups({ groups }: { groups: ClaimGroup[] }) {
  return (
    <ul data-testid="claim-groups">
      {groups.map((group) => (
        <li key={group.claim} data-testid={`claim-group-${group.claim}`}>
          <strong>{group.claim}</strong>
          {group.unsourced && (
            <span data-testid="unsourced-flag" style={{ color: 'crimson' }}>
              {' '}
              ⚠ unsourced
            </span>
          )}
          {group.citations.length > 0 && (
            <ul>
              {group.citations.map((citation, index) => (
                <li key={`${citation.url}-${index}`} data-testid="citation">
                  <a href={citation.url}>{citation.title}</a>
                  <blockquote data-testid="citation-snippet">{citation.quotedText}</blockquote>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}

interface ReviewButtonsProps {
  target: ReviewAction['target']
  id: string
  onReview: (action: ReviewAction) => void | Promise<void>
}

function ReviewButtons({ target, id, onReview }: ReviewButtonsProps) {
  return (
    <>
      {' '}
      <button type="button" onClick={() => onReview({ target, id, decision: 'accept' })}>
        Accept
      </button>{' '}
      <button type="button" onClick={() => onReview({ target, id, decision: 'reject' })}>
        Reject
      </button>
    </>
  )
}
