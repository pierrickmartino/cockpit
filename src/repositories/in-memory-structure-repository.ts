import { randomUUID } from 'node:crypto'
import type { Actor, NewActor } from '@/domain/actor'
import type { Flow, NewFlow } from '@/domain/flow'
import type { ReviewStatus } from '@/domain/review'
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
      status: 'proposed',
      citations: input.citations ?? [],
      createdAt: new Date(),
    }
    this.actors.push(clone(actor))
    return clone(actor)
  }

  async addFlow(input: NewFlow): Promise<Flow> {
    const flow: Flow = {
      id: randomUUID(),
      themeId: input.themeId,
      fromActorId: input.fromActorId,
      toActorId: input.toActorId,
      substitutability: input.substitutability,
      status: 'proposed',
      citations: input.citations ?? [],
      createdAt: new Date(),
    }
    this.flows.push(clone(flow))
    return clone(flow)
  }

  async listActors(themeId: string): Promise<Actor[]> {
    return this.actors.filter((actor) => actor.themeId === themeId).map(clone)
  }

  async listFlows(themeId: string): Promise<Flow[]> {
    return this.flows.filter((flow) => flow.themeId === themeId).map(clone)
  }

  async setActorStatus(
    themeId: string,
    actorId: string,
    status: ReviewStatus,
  ): Promise<Actor | null> {
    const actor = this.actors.find((entry) => entry.themeId === themeId && entry.id === actorId)
    if (!actor) {
      return null
    }
    actor.status = status
    return clone(actor)
  }

  async setFlowStatus(themeId: string, flowId: string, status: ReviewStatus): Promise<Flow | null> {
    const flow = this.flows.find((entry) => entry.themeId === themeId && entry.id === flowId)
    if (!flow) {
      return null
    }
    flow.status = status
    return clone(flow)
  }
}

/** Deep copy so callers can never mutate the store's nested values (e.g. citations). */
function clone<T>(value: T): T {
  return structuredClone(value)
}
