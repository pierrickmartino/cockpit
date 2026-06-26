/**
 * The grounding floor (ADR-0021): existence claims are hard-required to be
 * sourced. No actor survives a turn without a citation on its `relevance` claim;
 * no flow survives without one on its `dependency` claim. This is what keeps the
 * accept-gate from being theatre — every element the Admin reviews traces to
 * something real.
 *
 * Secondary claims (`tier`, `location`, `substitutability`) are *not* floored:
 * their value is still proposed, and the absence of a citation is the (derived)
 * unsourced flag the review queue shows — never dropped, never a stored boolean.
 */

import type { Citation, Claim } from '@/domain/citation'
import type {
  DroppedActor,
  DroppedFlow,
  ProposedActor,
  ProposedFlow,
} from '@/domain/generation'

const MISSING_RELEVANCE = 'no citation for the relevance claim'
const MISSING_DEPENDENCY = 'no citation for the dependency claim'

function hasCitationFor(citations: Citation[], claim: Claim): boolean {
  return citations.some((citation) => citation.claim === claim)
}

/** Partition proposed actors into those grounded on `relevance` and the dropped rest. */
export function applyActorGroundingFloor(actors: ProposedActor[]): {
  surviving: ProposedActor[]
  dropped: DroppedActor[]
} {
  const surviving: ProposedActor[] = []
  const dropped: DroppedActor[] = []

  for (const actor of actors) {
    if (hasCitationFor(actor.citations, 'relevance')) {
      surviving.push(actor)
    } else {
      dropped.push({ ref: actor.ref, name: actor.name, reason: MISSING_RELEVANCE })
    }
  }

  return { surviving, dropped }
}

/** Partition proposed flows into those grounded on `dependency` and the dropped rest. */
export function applyFlowGroundingFloor(flows: ProposedFlow[]): {
  surviving: ProposedFlow[]
  dropped: DroppedFlow[]
} {
  const surviving: ProposedFlow[] = []
  const dropped: DroppedFlow[] = []

  for (const flow of flows) {
    if (hasCitationFor(flow.citations, 'dependency')) {
      surviving.push(flow)
    } else {
      dropped.push({ fromRef: flow.fromRef, toRef: flow.toRef, reason: MISSING_DEPENDENCY })
    }
  }

  return { surviving, dropped }
}
