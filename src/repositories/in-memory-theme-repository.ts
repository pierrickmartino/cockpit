import { randomUUID } from 'node:crypto'
import type { NewTheme, Theme } from '@/domain/theme'
import type { ThemeRepository } from '@/repositories/theme-repository'

/**
 * In-memory fake used as the development/test double for ThemeRepository.
 * Verified against the same contract suite as the Postgres implementation.
 */
export class InMemoryThemeRepository implements ThemeRepository {
  private readonly themes = new Map<string, Theme>()

  async create(input: NewTheme): Promise<Theme> {
    const theme: Theme = {
      id: randomUUID(),
      title: input.title,
      state: 'working',
      createdAt: new Date(),
    }
    this.themes.set(theme.id, { ...theme })
    return theme
  }

  async findById(id: string): Promise<Theme | null> {
    const theme = this.themes.get(id)
    return theme ? { ...theme } : null
  }
}
