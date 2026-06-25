import { randomUUID } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemorySnapshotRepository } from '@/repositories/in-memory-snapshot-repository'
import { InMemoryStructureRepository } from '@/repositories/in-memory-structure-repository'
import { getPublishedSnapshot, publishTheme } from '@/services/snapshot-service'

const THEME_ID = randomUUID()

let structure: InMemoryStructureRepository
let snapshots: InMemorySnapshotRepository

beforeEach(() => {
  structure = new InMemoryStructureRepository()
  snapshots = new InMemorySnapshotRepository()
})

/** Add an actor already moved to `accepted`, returning its id. */
async function acceptedActor(name: string): Promise<string> {
  const actor = await structure.addActor({ themeId: THEME_ID, name, kind: 'point', actorKey: name })
  await structure.setActorStatus(THEME_ID, actor.id, 'accepted')
  return actor.id
}

describe('publishTheme', () => {
  it('freezes the accepted working state as version 1 and returns 201', async () => {
    await acceptedActor('TSMC')
    // A still-proposed actor must not reach the published snapshot.
    await structure.addActor({ themeId: THEME_ID, name: 'Draft', kind: 'point', actorKey: 'DRAFT' })

    const result = await publishTheme(structure, snapshots, THEME_ID)

    expect(result.status).toBe(201)
    expect(result.body.success).toBe(true)
    expect(result.body.data?.version).toBe(1)
    expect(result.body.data?.content.actors.map((a) => a.name)).toEqual(['TSMC'])
  })

  it('republishing creates a new version', async () => {
    await acceptedActor('TSMC')
    await publishTheme(structure, snapshots, THEME_ID)

    const second = await publishTheme(structure, snapshots, THEME_ID)

    expect(second.body.data?.version).toBe(2)
  })

  it('leaves a prior published snapshot unchanged by later working edits', async () => {
    await acceptedActor('TSMC')
    await publishTheme(structure, snapshots, THEME_ID)

    // Author and accept more structure, but do NOT republish.
    await acceptedActor('ASML')

    const published = await getPublishedSnapshot(snapshots, THEME_ID)
    expect(published.body.data?.content.actors.map((a) => a.name)).toEqual(['TSMC'])
  })
})

describe('getPublishedSnapshot', () => {
  it('returns 404 when the theme has no published snapshot', async () => {
    const result = await getPublishedSnapshot(snapshots, THEME_ID)

    expect(result.status).toBe(404)
    expect(result.body.success).toBe(false)
    expect(result.body.data).toBeUndefined()
  })

  it('returns the latest published snapshot with 200', async () => {
    await acceptedActor('TSMC')
    await publishTheme(structure, snapshots, THEME_ID)

    const result = await getPublishedSnapshot(snapshots, THEME_ID)

    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)
    expect(result.body.data?.version).toBe(1)
  })
})
