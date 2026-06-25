import { asc, desc, eq, sql } from 'drizzle-orm'
import type { Database } from '@/db/client'
import { publishedSnapshots, type PublishedSnapshotRow } from '@/db/schema'
import type { PublishedSnapshot } from '@/domain/published-snapshot'
import type { SnapshotContent } from '@/domain/snapshot'
import type { SnapshotRepository } from '@/repositories/snapshot-repository'

/** Postgres-backed SnapshotRepository. Verified by the shared contract suite. */
export class PostgresSnapshotRepository implements SnapshotRepository {
  constructor(private readonly db: Database) {}

  async publish(themeId: string, content: SnapshotContent): Promise<PublishedSnapshot> {
    // The next per-theme version. Concurrent publishes to one theme are out of
    // scope (single authoring session per theme, PRD §2); the unique
    // (theme_id, version) constraint is the backstop if that ever changes.
    const [{ next }] = await this.db
      .select({ next: sql<number>`coalesce(max(${publishedSnapshots.version}), 0) + 1` })
      .from(publishedSnapshots)
      .where(eq(publishedSnapshots.themeId, themeId))

    const [row] = await this.db
      .insert(publishedSnapshots)
      .values({ themeId, version: next, content })
      .returning()
    return toSnapshot(row)
  }

  async findLatest(themeId: string): Promise<PublishedSnapshot | null> {
    const [row] = await this.db
      .select()
      .from(publishedSnapshots)
      .where(eq(publishedSnapshots.themeId, themeId))
      .orderBy(desc(publishedSnapshots.version))
      .limit(1)
    return row ? toSnapshot(row) : null
  }

  async listByTheme(themeId: string): Promise<PublishedSnapshot[]> {
    const rows = await this.db
      .select()
      .from(publishedSnapshots)
      .where(eq(publishedSnapshots.themeId, themeId))
      .orderBy(asc(publishedSnapshots.version))
    return rows.map(toSnapshot)
  }
}

function toSnapshot(row: PublishedSnapshotRow): PublishedSnapshot {
  return {
    id: row.id,
    themeId: row.themeId,
    version: row.version,
    content: row.content as SnapshotContent,
    publishedAt: row.publishedAt,
  }
}
