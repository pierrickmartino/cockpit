import type { Actor, NewActor } from '@/domain/actor'
import type { Flow, NewFlow } from '@/domain/flow'
import type { ReviewStatus } from '@/domain/review'

/**
 * Persistence boundary for a theme's working structure — Actors and the Flows
 * between them (repository pattern, ADR-0006). The Postgres-backed and in-memory
 * implementations are interchangeable and share one contract suite, so they
 * cannot drift apart. New actors and flows enter as `proposed` (accept-gate,
 * ADR-0004); `setActorStatus`/`setFlowStatus` record the Admin's review.
 */
export interface StructureRepository {
  addActor(input: NewActor): Promise<Actor>
  addFlow(input: NewFlow): Promise<Flow>
  listActors(themeId: string): Promise<Actor[]>
  listFlows(themeId: string): Promise<Flow[]>
  /** Set an actor's review status within a theme; null when no such actor. */
  setActorStatus(themeId: string, actorId: string, status: ReviewStatus): Promise<Actor | null>
  /** Set a flow's review status within a theme; null when no such flow. */
  setFlowStatus(themeId: string, flowId: string, status: ReviewStatus): Promise<Flow | null>
}
