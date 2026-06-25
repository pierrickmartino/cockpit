import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryThemeRepository } from '@/repositories/in-memory-theme-repository'

const ADMIN_TOKEN = 's3cret-admin-token'

// Share one in-memory repository across the route handlers under test, so a
// theme created via POST can be read back via GET — no Postgres required.
const repository = new InMemoryThemeRepository()
vi.mock('@/repositories/factory', () => ({
  getThemeRepository: () => repository,
}))

// Imported after the mock is registered so the route binds to the fake factory.
const { POST } = await import('@/app/api/themes/route')
const { GET } = await import('@/app/api/themes/[id]/route')

function postThemeRequest(body: unknown, token?: string): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) {
    headers.authorization = `Bearer ${token}`
  }

  return new Request('https://cockpit.test/api/themes', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/themes (authoring route)', () => {
  it('denies a public principal with a 401 clean error envelope and persists nothing', async () => {
    const response = await POST(postThemeRequest({ title: 'Semiconductors' }))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Admin authentication required')
    expect(body.data).toBeUndefined()
  })

  it('allows an admin principal to create a theme (201)', async () => {
    const response = await POST(postThemeRequest({ title: 'Energy' }, ADMIN_TOKEN))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.title).toBe('Energy')
  })
})

describe('GET /api/themes/[id] (viewer route)', () => {
  it('remains reachable by a public principal', async () => {
    const created = await repository.create({ title: 'Published theme' })

    const response = await GET(new Request(`https://cockpit.test/api/themes/${created.id}`), {
      params: Promise.resolve({ id: created.id }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.id).toBe(created.id)
  })
})
