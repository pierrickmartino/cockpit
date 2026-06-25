import { randomUUID } from 'node:crypto'
import type { Actor, NewActor } from '@/domain/actor'
import type { Flow, NewFlow } from '@/domain/flow'
import type { StructureRepository } from '@/repositories/structure-repository'

/**
 * In-memory fake used as the development/test double for StructureRepository.
 * Verified against the same contract suite as the Postgres implementation.
 * Stored entries are copied in and out so callers can never mutate the store.
 */
export class InMemoryStructureRepository implements StructureRepository {
  private readonly actors: Actor[] = []
  private readonly flows: Flow[] = []

  async addActor(input: NewActor): Promise<Actor> {
    const actor: Actor = {
      id: randomUUID(),
      themeId: input.themeId,
      name: input.name,
      kind: input.kind,
      actorKey: input.actorKey,
      tier: input.tier ?? null,
      location: input.location ?? null,
      createdAt: new Date(),
    }
    this.actors.push({ ...actor })
    return actor
  }

  async addFlow(input: NewFlow): Promise<Flow> {
    const flow: Flow = {
      id: randomUUID(),
      themeId: input.themeId,
      fromActorId: input.fromActorId,
      toActorId: input.toActorId,
      substitutability: input.substitutability,
      createdAt: new Date(),
    }
    this.flows.push({ ...flow })
    return flow
  }

  async listActors(themeId: string): Promise<Actor[]> {
    return this.actors.filter((actor) => actor.themeId === themeId).map((actor) => ({ ...actor }))
  }

  async listFlows(themeId: string): Promise<Flow[]> {
    return this.flows.filter((flow) => flow.themeId === themeId).map((flow) => ({ ...flow }))
  }
}
