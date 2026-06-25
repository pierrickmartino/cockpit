import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { InMemoryStructureRepository } from '@/repositories/in-memory-structure-repository'

const ADMIN_TOKEN = 's3cret-admin-token'
const THEME_ID = randomUUID()

// Share one in-memory repository across the route handlers so structure created
// via POST can be read back via GET — no Postgres required.
const repository = new InMemoryStructureRepository()
vi.mock('@/repositories/factory', () => ({
  getStructureRepository: () => repository,
}))

const { POST: postActor } = await import('@/app/api/themes/[id]/actors/route')
const { POST: postFlow } = await import('@/app/api/themes/[id]/flows/route')
const { GET: getStructure } = await import('@/app/api/themes/[id]/structure/route')
const { POST: postReview } = await import('@/app/api/themes/[id]/review/route')

function routeContext(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: THEME_ID }) }
}

function request(method: string, body: unknown, token?: string): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) {
    headers.authorization = `Bearer ${token}`
  }

  const init: RequestInit = { method, headers }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }

  return new Request(`https://cockpit.test/api/themes/${THEME_ID}/structure`, init)
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

describe('POST /api/themes/[id]/actors (authoring route)', () => {
  it('denies a public principal with a 401 clean error envelope', async () => {
    const response = await postActor(
      request('POST', { name: 'TSMC', kind: 'point', actorKey: 'TSM' }),
      routeContext(),
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Admin authentication required')
    expect(body.data).toBeUndefined()
  })

  it('allows an admin principal to add an actor (201)', async () => {
    const response = await postActor(
      request('POST', { name: 'TSMC', kind: 'point', actorKey: 'TSM' }, ADMIN_TOKEN),
      routeContext(),
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('TSMC')
  })
})

describe('POST /api/themes/[id]/flows (authoring route)', () => {
  it('denies a public principal with a 401 clean error envelope', async () => {
    const response = await postFlow(
      request('POST', { fromActorId: randomUUID(), toActorId: randomUUID(), substitutability: 0.1 }),
      routeContext(),
    )

    expect(response.status).toBe(401)
  })

  it('allows an admin principal to add a flow between existing actors (201)', async () => {
    const from = await repository.addActor({ themeId: THEME_ID, name: 'A', kind: 'point', actorKey: 'A' })
    const to = await repository.addActor({ themeId: THEME_ID, name: 'B', kind: 'point', actorKey: 'B' })

    const response = await postFlow(
      request('POST', { fromActorId: from.id, toActorId: to.id, substitutability: 0.3 }, ADMIN_TOKEN),
      routeContext(),
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.data.substitutability).toBe(0.3)
  })
})

describe('POST /api/themes/[id]/review (accept-gate route)', () => {
  it('denies a public principal with a 401', async () => {
    const response = await postReview(
      request('POST', { actions: [{ target: 'actor', id: randomUUID(), decision: 'accept' }] }),
      routeContext(),
    )

    expect(response.status).toBe(401)
  })

  it('allows an admin principal to accept a proposed actor (200)', async () => {
    const actor = await repository.addActor({
      themeId: THEME_ID,
      name: 'Reviewable',
      kind: 'point',
      actorKey: 'REV',
    })

    const response = await postReview(
      request('POST', { actions: [{ target: 'actor', id: actor.id, decision: 'accept' }] }, ADMIN_TOKEN),
      routeContext(),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.actors.find((a: { id: string }) => a.id === actor.id).status).toBe('accepted')
  })
})

describe('GET /api/themes/[id]/structure (workbench preview)', () => {
  it('denies a public principal', async () => {
    const response = await getStructure(request('GET', undefined), routeContext())
    expect(response.status).toBe(401)
  })

  it('returns the current actors and flows for an admin principal', async () => {
    const response = await getStructure(request('GET', undefined, ADMIN_TOKEN), routeContext())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data.actors)).toBe(true)
    expect(Array.isArray(body.data.flows)).toBe(true)
    expect(body.data.actors.length).toBeGreaterThan(0)
  })
})
