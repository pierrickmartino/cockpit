import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, it } from 'vitest'
import * as schema from '@/db/schema'
import { PostgresStructureRepository } from '@/repositories/postgres-structure-repository'
import { runStructureRepositoryContract } from '../contract/structure-repository.contract'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  // The fake half of the contract always runs; the Postgres half needs a real
  // database and is skipped (not failed) when DATABASE_URL is absent.
  describe.skip('StructureRepository contract: PostgresStructureRepository (DATABASE_URL not set)', () => {
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

  runStructureRepositoryContract('PostgresStructureRepository', async () => {
    // Fresh structure per test, attached to a real theme row so foreign keys hold.
    await db.execute(
      sql`truncate table ${schema.flows}, ${schema.actors}, ${schema.themes} restart identity cascade`,
    )
    const [theme] = await db.insert(schema.themes).values({ title: 'Contract theme' }).returning()
    return { repository: new PostgresStructureRepository(db), themeId: theme.id }
  })
}
