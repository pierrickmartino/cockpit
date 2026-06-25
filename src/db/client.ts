import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@/db/schema'

export type Database = NodePgDatabase<typeof schema>

let pool: Pool | undefined
let db: Database | undefined

/**
 * Lazily build a singleton Drizzle client from DATABASE_URL. Throwing here (vs.
 * at import time) keeps modules importable in environments without a database.
 */
export function getDb(): Database {
  if (db) return db

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  pool = new Pool({ connectionString })
  db = drizzle(pool, { schema })
  return db
}
