import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, it } from 'vitest'
import * as schema from '@/db/schema'
import { PostgresThemeRepository } from '@/repositories/postgres-theme-repository'
import { runThemeRepositoryContract } from '../contract/theme-repository.contract'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  // The fake half of the contract always runs; the Postgres half needs a real
  // database and is skipped (not failed) when DATABASE_URL is absent.
  describe.skip('ThemeRepository contract: PostgresThemeRepository (DATABASE_URL not set)', () => {
    it('is skipped without DATABASE_URL', () => {})
  })
} else {
  const pool = new Pool({ connectionString })
  const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema })

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: 'drizzle' })
  })

  afterAll(async () => {
    await pool.end()
  })

  runThemeRepositoryContract('PostgresThemeRepository', async () => {
    // Fresh, empty repository per test for isolation.
    await db.execute(sql`truncate table ${schema.themes} restart identity cascade`)
    return new PostgresThemeRepository(db)
  })
}
