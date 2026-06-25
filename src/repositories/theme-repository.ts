import type { NewTheme, Theme } from '@/domain/theme'

/**
 * Persistence boundary for Themes (repository pattern, per ADR-0006).
 * Business logic depends on this interface, never on a concrete store, so the
 * Postgres-backed and in-memory implementations are interchangeable and share
 * one contract test suite.
 */
export interface ThemeRepository {
  create(input: NewTheme): Promise<Theme>
  findById(id: string): Promise<Theme | null>
}
