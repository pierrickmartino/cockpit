import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { GenerationModel } from '@/domain/generation'
import { InMemoryStructureRepository } from '@/repositories/in-memory-structure-repository'
import { GenerationNotConfiguredError } from '@/services/generation-model-factory'
import { FakeGenerationModel } from '../generation/fake-generation-model'

const ADMIN_TOKEN = 's3cret-admin-token'
const THEME_ID = randomUUID()

// Share one in-memory repository across the route handler — no Postgres required.
const repository = new InMemoryStructureRepository()
vi.mock('@/repositories/factory', () => ({
  getStructureRepository: () => repository,
}))

// The model factory is swapped per test: a fake for the happy path, a throw for
// the not-configured path. The real `GenerationNotConfiguredError` is preserved.
const resolveModel = vi.fn<() => GenerationModel>()
vi.mock('@/services/generation-model-factory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/generation-model-factory')>()
  return { ...actual, getGenerationModel: () => resolveModel() }
})

const { POST: postGenerate } = await import('@/app/api/themes/[id]/generate/route')

function routeContext(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: THEME_ID }) }
}

function request(body: unknown, token?: string): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) {
    headers.authorization = `Bearer ${token}`
  }

  const init: RequestInit = { method: 'POST', headers }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }

  return new Request(`https://cockpit.test/api/themes/${THEME_ID}/generate`, init)
}

const messages = [{ role: 'admin', text: 'Build the AI compute graph.' }]

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

describe('POST /api/themes/[id]/generate', () => {
  it('denies a public principal with a 401 clean error envelope', async () => {
    resolveModel.mockReturnValue(new FakeGenerationModel({ reply: 'hi', proposedActors: [], proposedFlows: [] }))

    const response = await postGenerate(request({ messages }), routeContext())
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Admin authentication required')
  })

  it('returns { reply, proposals, report } for an admin principal', async () => {
    resolveModel.mockReturnValue(
      new FakeGenerationModel({
        reply: 'Proposed TSMC.',
        proposedActors: [
          {
            ref: 'tsmc',
            name: 'TSMC',
            kind: 'point',
            actorKey: 'TSM',
            citations: [
              {
                claim: 'relevance',
                url: 'https://example.test/tsmc',
                title: 'TSMC',
                quotedText: 'TSMC is central to AI compute.',
              },
            ],
          },
        ],
        proposedFlows: [],
      }),
    )

    const response = await postGenerate(request({ messages }, ADMIN_TOKEN), routeContext())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.reply).toBe('Proposed TSMC.')
    expect(body.data.proposals.actors).toHaveLength(1)
    expect(body.data.report.addedActors).toEqual(['TSMC'])
  })

  it('returns a generic 503 when no model adapter is configured', async () => {
    resolveModel.mockImplementation(() => {
      throw new GenerationNotConfiguredError()
    })

    const response = await postGenerate(request({ messages }, ADMIN_TOKEN), routeContext())
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Generation is not configured')
  })
})
