/**
 * Derives, for the review queue, how each Claim an actor or flow asserts is
 * grounded: the citations that back it and whether a secondary claim is
 * *unsourced* (ADR-0021). "Unsourced" is **derived from the citation list, never
 * stored** — there is one source of truth. Existence claims (`relevance`,
 * `dependency`) are guaranteed by the grounding floor and are never flagged here;
 * only the secondary claims (`tier`, `location`, `substitutability`) carry the
 * flag, and only when their value is asserted but no citation backs it.
 */

import type { Actor } from '@/domain/actor'
import type { Citation, Claim } from '@/domain/citation'
import type { Flow } from '@/domain/flow'

/** One claim an element asserts, the citations backing it, and the derived flag. */
export interface ClaimGroup {
  claim: Claim
  citations: Citation[]
  /** True when a secondary claim is asserted but no citation grounds it. */
  unsourced: boolean
}

function citationsFor(citations: Citation[], claim: Claim): Citation[] {
  return citations.filter((citation) => citation.claim === claim)
}

/** An existence-claim group: present by definition, never flagged unsourced. */
function existenceGroup(citations: Citation[], claim: Claim): ClaimGroup {
  return { claim, citations: citationsFor(citations, claim), unsourced: false }
}

/** A secondary-claim group: flagged unsourced when no citation backs its value. */
function secondaryGroup(citations: Citation[], claim: Claim): ClaimGroup {
  const matched = citationsFor(citations, claim)
  return { claim, citations: matched, unsourced: matched.length === 0 }
}

/**
 * The claim groups to review for an actor: `relevance` always, plus `tier` and
 * `location` only where the actor asserts a value for them.
 */
export function reviewClaimsForActor(actor: Actor): ClaimGroup[] {
  const groups: ClaimGroup[] = [existenceGroup(actor.citations, 'relevance')]
  if (actor.tier !== null) {
    groups.push(secondaryGroup(actor.citations, 'tier'))
  }
  if (actor.location !== null) {
    groups.push(secondaryGroup(actor.citations, 'location'))
  }
  return groups
}

/**
 * The claim groups to review for a flow: `dependency` always, and
 * `substitutability` always (a flow always carries a substitutability value).
 */
export function reviewClaimsForFlow(flow: Flow): ClaimGroup[] {
  return [
    existenceGroup(flow.citations, 'dependency'),
    secondaryGroup(flow.citations, 'substitutability'),
  ]
}
