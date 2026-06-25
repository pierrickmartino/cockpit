import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { InMemorySnapshotRepository } from '@/repositories/in-memory-snapshot-repository'
import { InMemoryStructureRepository } from '@/repositories/in-memory-structure-repository'

const ADMIN_TOKEN = 's3cret-admin-token'
const THEME_ID = randomUUID()

// Share in-memory repositories across the route handler so a publish persists a
// snapshot that the viewer read can find — no Postgres required.
const structure = new InMemoryStructureRepository()
const snapshots = new InMemorySnapshotRepository()
vi.mock('@/repositories/factory', () => ({
  getStructureRepository: () => structure,
  getSnapshotRepository: () => snapshots,
}))

const { POST: postPublish } = await import('@/app/api/themes/[id]/publish/route')

function routeContext(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: THEME_ID }) }
}

function request(token?: string): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) {
    headers.authorization = `Bearer ${token}`
  }
  return new Request(`https://cockpit.test/api/themes/${THEME_ID}/publish`, { method: 'POST', headers })
}

let previousToken: string | undefined

beforeAll(() => {
  previousToken = process.env.ADMIN_TOKEN
  process.env.ADMIN_TOKEN = ADMIN_TOKEN
})

afterAll(() => {
  if (previousToken === undefined) {
    delete process.env.ADMIN_TOKEN
  } else {
    process.env.ADMIN_TOKEN = previousToken
  }
})

describe('POST /api/themes/[id]/publish (publish route)', () => {
  it('denies a public principal with a 401 clean error envelope', async () => {
    const response = await postPublish(request(), routeContext())
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Admin authentication required')
    expect(body.data).toBeUndefined()
  })

  it('allows an admin principal to publish a snapshot (201)', async () => {
    const actor = await structure.addActor({
      themeId: THEME_ID,
      name: 'TSMC',
      kind: 'point',
      actorKey: 'TSM',
    })
    await structure.setActorStatus(THEME_ID, actor.id, 'accepted')

    const response = await postPublish(request(ADMIN_TOKEN), routeContext())
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.version).toBe(1)
    expect(body.data.content.actors[0].name).toBe('TSMC')
  })
})
