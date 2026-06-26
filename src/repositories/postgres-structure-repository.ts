import { and, asc, eq } from 'drizzle-orm'
import type { Database } from '@/db/client'
import { actors, flows, type ActorRow, type FlowRow } from '@/db/schema'
import type { Actor, ActorKind, NewActor } from '@/domain/actor'
import type { Flow, NewFlow } from '@/domain/flow'
import type { ReviewStatus } from '@/domain/review'
import type { StructureRepository } from '@/repositories/structure-repository'

/** Postgres-backed StructureRepository. Verified by the shared contract suite. */
export class PostgresStructureRepository implements StructureRepository {
  constructor(private readonly db: Database) {}

  async addActor(input: NewActor): Promise<Actor> {
    const [row] = await this.db
      .insert(actors)
      .values({
        themeId: input.themeId,
        name: input.name,
        kind: input.kind,
        actorKey: input.actorKey,
        tier: input.tier ?? null,
        location: input.location ?? null,
        citations: input.citations ?? [],
      })
      .returning()
    return toActor(row)
  }

  async addFlow(input: NewFlow): Promise<Flow> {
    const [row] = await this.db
      .insert(flows)
      .values({
        themeId: input.themeId,
        fromActorId: input.fromActorId,
        toActorId: input.toActorId,
        substitutability: input.substitutability,
        citations: input.citations ?? [],
      })
      .returning()
    return toFlow(row)
  }

  async listActors(themeId: string): Promise<Actor[]> {
    const rows = await this.db
      .select()
      .from(actors)
      .where(eq(actors.themeId, themeId))
      .orderBy(asc(actors.createdAt), asc(actors.id))
    return rows.map(toActor)
  }

  async listFlows(themeId: string): Promise<Flow[]> {
    const rows = await this.db
      .select()
      .from(flows)
      .where(eq(flows.themeId, themeId))
      .orderBy(asc(flows.createdAt), asc(flows.id))
    return rows.map(toFlow)
  }

  async setActorStatus(
    themeId: string,
    actorId: string,
    status: ReviewStatus,
  ): Promise<Actor | null> {
    const [row] = await this.db
      .update(actors)
      .set({ status })
      .where(and(eq(actors.id, actorId), eq(actors.themeId, themeId)))
      .returning()
    return row ? toActor(row) : null
  }

  async setFlowStatus(themeId: string, flowId: string, status: ReviewStatus): Promise<Flow | null> {
    const [row] = await this.db
      .update(flows)
      .set({ status })
      .where(and(eq(flows.id, flowId), eq(flows.themeId, themeId)))
      .returning()
    return row ? toFlow(row) : null
  }
}

function toActor(row: ActorRow): Actor {
  return {
    id: row.id,
    themeId: row.themeId,
    name: row.name,
    kind: row.kind as ActorKind,
    actorKey: row.actorKey,
    tier: row.tier,
    location: row.location,
    status: row.status as ReviewStatus,
    citations: row.citations,
    createdAt: row.createdAt,
  }
}

function toFlow(row: FlowRow): Flow {
  return {
    id: row.id,
    themeId: row.themeId,
    fromActorId: row.fromActorId,
    toActorId: row.toActorId,
    substitutability: row.substitutability,
    status: row.status as ReviewStatus,
    citations: row.citations,
    createdAt: row.createdAt,
  }
}
