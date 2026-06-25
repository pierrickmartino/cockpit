import type { SnapshotContent } from '@/domain/snapshot'

/**
 * A published version of a theme: the stable, frozen snapshot Viewers read
 * (CONTEXT.md "Published version"). Snapshots are immutable — publishing only
 * ever appends a new version, never mutates a prior one (ADR-0012). `version`
 * is a per-theme integer starting at 1.
 */
export interface PublishedSnapshot {
  id: string
  themeId: string
  version: number
  content: SnapshotContent
  publishedAt: Date
}
