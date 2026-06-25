import { describe, expect, it } from 'vitest'
import type { ThemeRepository } from '@/repositories/theme-repository'

/**
 * The behavioural contract every ThemeRepository must satisfy. The fake and the
 * Postgres implementation run this exact suite, so they cannot drift apart.
 *
 * `createRepository` returns a fresh, empty repository per test to keep tests
 * isolated.
 */
export function runThemeRepositoryContract(
  name: string,
  createRepository: () => Promise<ThemeRepository> | ThemeRepository,
): void {
  describe(`ThemeRepository contract: ${name}`, () => {
    it('persists a created theme and returns it by id', async () => {
      const repository = await createRepository()
      const created = await repository.create({ title: 'Semiconductors' })

      const found = await repository.findById(created.id)

      expect(found).toEqual(created)
    })

    it('stamps a new theme with an id, its title, and working state', async () => {
      const repository = await createRepository()

      const created = await repository.create({ title: 'Energy' })

      expect(created.id).toBeTruthy()
      expect(created.title).toBe('Energy')
      expect(created.state).toBe('working')
      expect(created.createdAt).toBeInstanceOf(Date)
    })

    it('returns null when reading a theme that does not exist', async () => {
      const repository = await createRepository()

      const found = await repository.findById('00000000-0000-0000-0000-000000000000')

      expect(found).toBeNull()
    })
  })
}
