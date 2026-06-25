import { getDb } from '@/db/client'
import { PostgresSnapshotRepository } from '@/repositories/postgres-snapshot-repository'
import { PostgresStructureRepository } from '@/repositories/postgres-structure-repository'
import { PostgresThemeRepository } from '@/repositories/postgres-theme-repository'
import type { SnapshotRepository } from '@/repositories/snapshot-repository'
import type { StructureRepository } from '@/repositories/structure-repository'
import type { ThemeRepository } from '@/repositories/theme-repository'

/** Wire the production (Postgres) ThemeRepository for route handlers. */
export function getThemeRepository(): ThemeRepository {
  return new PostgresThemeRepository(getDb())
}

/** Wire the production (Postgres) StructureRepository for route handlers. */
export function getStructureRepository(): StructureRepository {
  return new PostgresStructureRepository(getDb())
}

/** Wire the production (Postgres) SnapshotRepository for route handlers. */
export function getSnapshotRepository(): SnapshotRepository {
  return new PostgresSnapshotRepository(getDb())
}
