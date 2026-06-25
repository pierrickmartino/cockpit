import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, it } from 'vitest'
import * as schema from '@/db/schema'
import { PostgresSnapshotRepository } from '@/repositories/postgres-snapshot-repository'
import { runSnapshotRepositoryContract } from '../contract/snapshot-repository.contract'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  // The fake half of the contract always runs; the Postgres half needs a real
  // database and is skipped (not failed) when DATABASE_URL is absent.
  describe.skip('SnapshotRepository contract: PostgresSnapshotRepository (DATABASE_URL not set)', () => {
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

  runSnapshotRepositoryContract('PostgresSnapshotRepository', async () => {
    // Fresh snapshots per test, attached to two real theme rows so the per-theme
    // versioning and scoping cases have valid foreign keys to point at.
    await db.execute(
      sql`truncate table ${schema.publishedSnapshots}, ${schema.flows}, ${schema.actors}, ${schema.themes} restart identity cascade`,
    )
    const [theme] = await db.insert(schema.themes).values({ title: 'Contract theme' }).returning()
    const [other] = await db.insert(schema.themes).values({ title: 'Other theme' }).returning()
    return {
      repository: new PostgresSnapshotRepository(db),
      themeId: theme.id,
      otherThemeId: other.id,
    }
  })
}
