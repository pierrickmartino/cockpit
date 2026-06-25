import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { InMemoryStructureRepository } from '@/repositories/in-memory-structure-repository'
import {
  addActor,
  addFlow,
  getWorkingStructure,
  reviewStructure,
} from '@/services/structure-service'

const THEME_ID = randomUUID()

async function seedActor(repo: InMemoryStructureRepository, name: string) {
  return repo.addActor({ themeId: THEME_ID, name, kind: 'point', actorKey: name })
}

describe('addActor', () => {
  it('persists a full actor and returns it in a 201 success envelope', async () => {
    const repo = new InMemoryStructureRepository()

    const result = await addActor(repo, THEME_ID, {
      name: 'TSMC',
      kind: 'point',
      actorKey: 'TSM',
      tier: 'foundry',
      location: 'Hsinchu, TW',
    })

    expect(result.status).toBe(201)
    expect(result.body.success).toBe(true)
    expect(result.body.data?.name).toBe('TSMC')
    expect(result.body.data?.kind).toBe('point')
    expect(result.body.data?.tier).toBe('foundry')

    const persisted = await repo.listActors(THEME_ID)
    expect(persisted).toHaveLength(1)
  })

  it('treats blank tier and location as null', async () => {
    const repo = new InMemoryStructureRepository()

    const result = await addActor(repo, THEME_ID, {
      name: 'Taiwan',
      kind: 'place',
      actorKey: 'TW',
      tier: '   ',
    })

    expect(result.status).toBe(201)
    expect(result.body.data?.tier).toBeNull()
    expect(result.body.data?.location).toBeNull()
  })

  it('rejects a blank name with a 400 error envelope and persists nothing', async () => {
    const repo = new InMemoryStructureRepository()

    const result = await addActor(repo, THEME_ID, { name: '  ', kind: 'point', actorKey: 'X' })

    expect(result.status).toBe(400)
    expect(result.body.success).toBe(false)
    expect(result.body.error).toBeTruthy()
    expect(await repo.listActors(THEME_ID)).toHaveLength(0)
  })

  it('rejects an unknown actor kind with a 400 error envelope', async () => {
    const repo = new InMemoryStructureRepository()

    const result = await addActor(repo, THEME_ID, { name: 'TSMC', kind: 'satellite', actorKey: 'TSM' })

    expect(result.status).toBe(400)
    expect(result.body.success).toBe(false)
  })
})

describe('addFlow', () => {
  it('persists a flow with substitutability in a 201 success envelope', async () => {
    const repo = new InMemoryStructureRepository()
    const from = await seedActor(repo, 'TSMC')
    const to = await seedActor(repo, 'ASML')

    const result = await addFlow(repo, THEME_ID, {
      fromActorId: from.id,
      toActorId: to.id,
      substitutability: 0.1,
    })

    expect(result.status).toBe(201)
    expect(result.body.data?.substitutability).toBe(0.1)
    expect(await repo.listFlows(THEME_ID)).toHaveLength(1)
  })

  it('rejects substitutability outside [0, 1] and persists nothing', async () => {
    const repo = new InMemoryStructureRepository()
    const from = await seedActor(repo, 'TSMC')
    const to = await seedActor(repo, 'ASML')

    const result = await addFlow(repo, THEME_ID, {
      fromActorId: from.id,
      toActorId: to.id,
      substitutability: 1.5,
    })

    expect(result.status).toBe(400)
    expect(result.body.success).toBe(false)
    expect(await repo.listFlows(THEME_ID)).toHaveLength(0)
  })

  it('rejects a flow whose endpoint is not an actor in this theme', async () => {
    const repo = new InMemoryStructureRepository()
    const from = await seedActor(repo, 'TSMC')

    const result = await addFlow(repo, THEME_ID, {
      fromActorId: from.id,
      toActorId: randomUUID(),
      substitutability: 0.5,
    })

    expect(result.status).toBe(400)
    expect(result.body.error).toBe('Flow endpoints must be actors in this theme')
    expect(await repo.listFlows(THEME_ID)).toHaveLength(0)
  })

  it('rejects a self-referential flow', async () => {
    const repo = new InMemoryStructureRepository()
    const actor = await seedActor(repo, 'TSMC')

    const result = await addFlow(repo, THEME_ID, {
      fromActorId: actor.id,
      toActorId: actor.id,
      substitutability: 0.5,
    })

    expect(result.status).toBe(400)
    expect(result.body.success).toBe(false)
    expect(await repo.listFlows(THEME_ID)).toHaveLength(0)
  })
})

describe('getWorkingStructure', () => {
  it('returns the theme actors and flows in a 200 success envelope', async () => {
    const repo = new InMemoryStructureRepository()
    const from = await seedActor(repo, 'TSMC')
    const to = await seedActor(repo, 'ASML')
    await addFlow(repo, THEME_ID, { fromActorId: from.id, toActorId: to.id, substitutability: 0.2 })

    const result = await getWorkingStructure(repo, THEME_ID)

    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)
    expect(result.body.data?.actors).toHaveLength(2)
    expect(result.body.data?.flows).toHaveLength(1)
  })

  it('returns empty arrays for a theme with no structure', async () => {
    const repo = new InMemoryStructureRepository()

    const result = await getWorkingStructure(repo, THEME_ID)

    expect(result.status).toBe(200)
    expect(result.body.data).toEqual({ actors: [], flows: [] })
  })
})

describe('reviewStructure', () => {
  it('accepts a proposed actor and returns the updated working structure', async () => {
    const repo = new InMemoryStructureRepository()
    const actor = await seedActor(repo, 'TSMC')

    const result = await reviewStructure(repo, THEME_ID, {
      actions: [{ target: 'actor', id: actor.id, decision: 'accept' }],
    })

    expect(result.status).toBe(200)
    expect(result.body.data?.actors[0].status).toBe('accepted')
    const [persisted] = await repo.listActors(THEME_ID)
    expect(persisted.status).toBe('accepted')
  })

  it('applies a mixed accept/reject batch and persists every decision', async () => {
    const repo = new InMemoryStructureRepository()
    const keep = await seedActor(repo, 'TSMC')
    const drop = await seedActor(repo, 'Generic')
    const flow = await repo.addFlow({
      themeId: THEME_ID,
      fromActorId: keep.id,
      toActorId: drop.id,
      substitutability: 0.5,
    })

    const result = await reviewStructure(repo, THEME_ID, {
      actions: [
        { target: 'actor', id: keep.id, decision: 'accept' },
        { target: 'actor', id: drop.id, decision: 'reject' },
        { target: 'flow', id: flow.id, decision: 'reject' },
      ],
    })

    expect(result.status).toBe(200)
    const actors = await repo.listActors(THEME_ID)
    expect(actors.find((a) => a.id === keep.id)?.status).toBe('accepted')
    expect(actors.find((a) => a.id === drop.id)?.status).toBe('rejected')
    expect((await repo.listFlows(THEME_ID))[0].status).toBe('rejected')
  })

  it('rejects malformed input with a 400 and persists nothing', async () => {
    const repo = new InMemoryStructureRepository()
    const actor = await seedActor(repo, 'TSMC')

    const result = await reviewStructure(repo, THEME_ID, {
      actions: [{ target: 'actor', id: actor.id, decision: 'maybe' }],
    })

    expect(result.status).toBe(400)
    expect(result.body.success).toBe(false)
    expect((await repo.listActors(THEME_ID))[0].status).toBe('proposed')
  })

  it('rejects an empty action batch with a 400', async () => {
    const repo = new InMemoryStructureRepository()

    const result = await reviewStructure(repo, THEME_ID, { actions: [] })

    expect(result.status).toBe(400)
    expect(result.body.success).toBe(false)
  })

  it('rejects an action targeting an element outside the theme and persists nothing', async () => {
    const repo = new InMemoryStructureRepository()
    const actor = await seedActor(repo, 'TSMC')

    const result = await reviewStructure(repo, THEME_ID, {
      actions: [{ target: 'actor', id: randomUUID(), decision: 'accept' }],
    })

    expect(result.status).toBe(400)
    expect(result.body.success).toBe(false)
    expect((await repo.listActors(THEME_ID))[0].status).toBe('proposed')
  })
})
