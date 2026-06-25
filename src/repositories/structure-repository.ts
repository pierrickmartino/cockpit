import type { Actor, NewActor } from '@/domain/actor'
import type { Flow, NewFlow } from '@/domain/flow'

/**
 * Persistence boundary for a theme's working structure — Actors and the Flows
 * between them (repository pattern, ADR-0006). The Postgres-backed and in-memory
 * implementations are interchangeable and share one contract suite, so they
 * cannot drift apart.
 */
export interface StructureRepository {
  addActor(input: NewActor): Promise<Actor>
  addFlow(input: NewFlow): Promise<Flow>
  listActors(themeId: string): Promise<Actor[]>
  listFlows(themeId: string): Promise<Flow[]>
}
