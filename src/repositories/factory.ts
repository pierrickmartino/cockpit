import { getDb } from '@/db/client'
import { PostgresThemeRepository } from '@/repositories/postgres-theme-repository'
import type { ThemeRepository } from '@/repositories/theme-repository'

/** Wire the production (Postgres) ThemeRepository for route handlers. */
export function getThemeRepository(): ThemeRepository {
  return new PostgresThemeRepository(getDb())
}
