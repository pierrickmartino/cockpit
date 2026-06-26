import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { GenerationModel } from '@/domain/generation'
import { InMemoryStructureRepository } from '@/repositories/in-memory-structure-repository'
import type { Admission } from '@/services/generation-limiter'
import { FakeGenerationModel } from '../generation/fake-generation-model'

const ADMIN_TOKEN = 's3cret-admin-token'
const THEME_ID = randomUUID()

const repository = new InMemoryStructureRepository()
vi.mock('@/repositories/factory', () => ({
  getStructureRepository: () => repository,
}))

const model: GenerationModel = new FakeGenerationModel({
  reply: 'ok',
  proposedActors: [],
  proposedFlows: [],
})
vi.mock('@/services/generation-model-factory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/generation-model-factory')>()
  return { ...actual, getGenerationModel: () => model }
})

// The route shares one limiter across requests; the test swaps in a controllable
// stand-in so admit/deny outcomes are deterministic without poking the singleton.
const tryAdmit = vi.fn<(key: string) => Admission>()
vi.mock('@/services/generation-limiter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/generation-limiter')>()
  return { ...actual, getGenerationLimiter: () => ({ tryAdmit }) }
})

const { POST: postGenerate } = await import('@/app/api/themes/[id]/generate/route')

function routeContext(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: THEME_ID }) }
}

function adminRequest(): Request {
  return new Request(`https://cockpit.test/api/themes/${THEME_ID}/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${ADMIN_TOKEN}` },
    body: JSON.stringify({ messages: [{ role: 'admin', text: 'Build the AI compute graph.' }] }),
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

afterEach(() => {
  tryAdmit.mockReset()
})

describe('POST /api/themes/[id]/generate rate limiting', () => {
  it('returns a clean retryable 429 when the rate limit is exceeded', async () => {
    tryAdmit.mockReturnValue({ ok: false, reason: 'rate', release: () => {} })

    const response = await postGenerate(adminRequest(), routeContext())
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Generation rate limit reached, please retry shortly')
    expect(body.error).not.toMatch(/token|bucket/i)
  })

  it('returns a clean retryable 429 when a generation is already in flight', async () => {
    tryAdmit.mockReturnValue({ ok: false, reason: 'concurrency', release: () => {} })

    const response = await postGenerate(adminRequest(), routeContext())
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.success).toBe(false)
    expect(body.error).toBe('A generation is already running, please retry shortly')
  })

  it('does not start a generation turn when admission is denied', async () => {
    const generate = vi.spyOn(model, 'generate')
    tryAdmit.mockReturnValue({ ok: false, reason: 'concurrency', release: () => {} })

    await postGenerate(adminRequest(), routeContext())

    expect(generate).not.toHaveBeenCalled()
    generate.mockRestore()
  })

  it('releases the in-flight slot after the turn completes', async () => {
    const release = vi.fn()
    tryAdmit.mockReturnValue({ ok: true, release })

    const response = await postGenerate(adminRequest(), routeContext())

    expect(response.status).toBe(200)
    expect(release).toHaveBeenCalledTimes(1)
  })

  it('releases the in-flight slot even when the turn throws', async () => {
    const release = vi.fn()
    tryAdmit.mockReturnValue({ ok: true, release })
    const generate = vi.spyOn(model, 'generate').mockRejectedValueOnce(new Error('boom'))

    // generateTurn catches model failures into a 502 envelope, so the route still
    // returns; the point is that release ran regardless of the failure.
    await postGenerate(adminRequest(), routeContext())

    expect(release).toHaveBeenCalledTimes(1)
    generate.mockRestore()
  })
})
