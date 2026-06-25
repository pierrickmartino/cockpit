import type { PublishedSnapshot } from '@/domain/published-snapshot'
import type { SnapshotContent } from '@/domain/snapshot'

/**
 * Persistence boundary for published snapshots (repository pattern, ADR-0006).
 * Snapshots are immutable: `publish` appends a new per-theme version and never
 * mutates a prior one (ADR-0012). The Postgres-backed and in-memory
 * implementations are interchangeable and share one contract suite.
 */
export interface SnapshotRepository {
  /** Freeze `content` as the theme's next version (1-based) and return it. */
  publish(themeId: string, content: SnapshotContent): Promise<PublishedSnapshot>
  /** The latest published snapshot for a theme, or null if none is published. */
  findLatest(themeId: string): Promise<PublishedSnapshot | null>
  /** All published snapshots for a theme, ascending by version. */
  listByTheme(themeId: string): Promise<PublishedSnapshot[]>
}
