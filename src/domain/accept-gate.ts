import type { Actor } from '@/domain/actor'
import type { Flow } from '@/domain/flow'
import type { ReviewStatus } from '@/domain/review'
import type { WorkingStructure } from '@/domain/structure'

/**
 * One Admin decision on one proposed element: accept it into the graph or reject
 * it. `target` disambiguates the id namespace (an Actor and a Flow could in
 * principle share an id); `id` names the element within that namespace.
 */
export interface ReviewAction {
  target: 'actor' | 'flow'
  id: string
  decision: 'accept' | 'reject'
}

/** The terminal status an accept/reject decision moves a proposed element to. */
const DECISION_STATUS: Record<ReviewAction['decision'], ReviewStatus> = {
  accept: 'accepted',
  reject: 'rejected',
}

/**
 * The accept-gate reducer (PRD module 7): apply a batch of Admin decisions to a
 * theme's working structure and return the resulting structure. Pure — it never
 * mutates the input and performs no I/O.
 *
 * Review is one-way: a decision only moves an element that is still `proposed`;
 * already-accepted/rejected elements are left untouched. That makes the reducer
 * idempotent (re-applying a batch changes nothing) and gives well-defined mixed
 * batches (each decision lands on its own target). Decisions naming an unknown
 * element are no-ops.
 */
export function applyReview(
  structure: WorkingStructure,
  actions: readonly ReviewAction[],
): WorkingStructure {
  const actorDecisions = decisionsFor(actions, 'actor')
  const flowDecisions = decisionsFor(actions, 'flow')

  return {
    actors: structure.actors.map((actor) => reviewed(actor, actorDecisions.get(actor.id))),
    flows: structure.flows.map((flow) => reviewed(flow, flowDecisions.get(flow.id))),
  }
}

/**
 * The accepted-only projection the workbench preview renders. Includes accepted
 * actors and accepted flows whose endpoints are both accepted — a flow to or
 * from a non-accepted actor is dropped so the preview never dangles. Pure.
 */
export function acceptedStructure(structure: WorkingStructure): WorkingStructure {
  const acceptedActors = structure.actors.filter((actor) => actor.status === 'accepted')
  const acceptedActorIds = new Set(acceptedActors.map((actor) => actor.id))

  return {
    actors: acceptedActors,
    flows: structure.flows.filter(
      (flow) =>
        flow.status === 'accepted' &&
        acceptedActorIds.has(flow.fromActorId) &&
        acceptedActorIds.has(flow.toActorId),
    ),
  }
}

/** The last decision per element id wins, so a batch is unambiguous. */
function decisionsFor(
  actions: readonly ReviewAction[],
  target: ReviewAction['target'],
): Map<string, ReviewAction['decision']> {
  const decisions = new Map<string, ReviewAction['decision']>()
  for (const action of actions) {
    if (action.target === target) {
      decisions.set(action.id, action.decision)
    }
  }
  return decisions
}

/**
 * Return a new element with the decided status, or the element unchanged when
 * there is no decision for it or it has already been reviewed. Immutable.
 */
function reviewed<T extends { status: ReviewStatus }>(
  element: T,
  decision: ReviewAction['decision'] | undefined,
): T {
  if (!decision || element.status !== 'proposed') {
    return element
  }
  return { ...element, status: DECISION_STATUS[decision] }
}
