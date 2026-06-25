import { asc, eq } from 'drizzle-orm'
import type { Database } from '@/db/client'
import { actors, flows, type ActorRow, type FlowRow } from '@/db/schema'
import type { Actor, ActorKind, NewActor } from '@/domain/actor'
import type { Flow, NewFlow } from '@/domain/flow'
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
    createdAt: row.createdAt,
  }
}
