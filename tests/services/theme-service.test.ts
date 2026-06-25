import { describe, expect, it } from 'vitest'
import { InMemoryThemeRepository } from '@/repositories/in-memory-theme-repository'
import { createTheme, getTheme } from '@/services/theme-service'

describe('createTheme', () => {
  it('persists the theme and returns it in a 201 success envelope', async () => {
    const repo = new InMemoryThemeRepository()

    const result = await createTheme(repo, { title: 'Semiconductors' })

    expect(result.status).toBe(201)
    expect(result.body.success).toBe(true)
    expect(result.body.data?.title).toBe('Semiconductors')
    expect(result.body.data?.state).toBe('working')

    const persisted = await repo.findById(result.body.data!.id)
    expect(persisted).not.toBeNull()
  })

  it('rejects a blank title with a 400 error envelope and persists nothing', async () => {
    const repo = new InMemoryThemeRepository()

    const result = await createTheme(repo, { title: '   ' })

    expect(result.status).toBe(400)
    expect(result.body.success).toBe(false)
    expect(result.body.error).toBeTruthy()
    expect(result.body.data).toBeUndefined()
  })
})

describe('getTheme', () => {
  it('returns the persisted theme in a 200 success envelope', async () => {
    const repo = new InMemoryThemeRepository()
    const created = await repo.create({ title: 'Energy' })

    const result = await getTheme(repo, created.id)

    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)
    expect(result.body.data).toEqual(created)
  })

  it('returns a clean 404 error envelope when the theme does not exist', async () => {
    const repo = new InMemoryThemeRepository()

    const result = await getTheme(repo, '00000000-0000-0000-0000-000000000000')

    expect(result.status).toBe(404)
    expect(result.body.success).toBe(false)
    expect(result.body.error).toBe('Theme not found')
    expect(result.body.data).toBeUndefined()
  })
})
