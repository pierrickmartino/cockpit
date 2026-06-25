import { randomUUID } from 'node:crypto'
import type { PublishedSnapshot } from '@/domain/published-snapshot'
import type { SnapshotContent } from '@/domain/snapshot'
import type { SnapshotRepository } from '@/repositories/snapshot-repository'

/**
 * In-memory fake used as the development/test double for SnapshotRepository.
 * Verified against the same contract suite as the Postgres implementation.
 * Frozen content is deep-copied in and out, so a published snapshot can never
 * be mutated through a caller's reference (immutability, ADR-0012).
 */
export class InMemorySnapshotRepository implements SnapshotRepository {
  private readonly snapshots: PublishedSnapshot[] = []

  async publish(themeId: string, content: SnapshotContent): Promise<PublishedSnapshot> {
    const existing = this.snapshots.filter((snapshot) => snapshot.themeId === themeId)
    const snapshot: PublishedSnapshot = {
      id: randomUUID(),
      themeId,
      version: existing.length + 1,
      content: structuredClone(content),
      publishedAt: new Date(),
    }
    this.snapshots.push(snapshot)
    return copy(snapshot)
  }

  async findLatest(themeId: string): Promise<PublishedSnapshot | null> {
    const forTheme = this.byTheme(themeId)
    const latest = forTheme.at(-1)
    return latest ? copy(latest) : null
  }

  async listByTheme(themeId: string): Promise<PublishedSnapshot[]> {
    return this.byTheme(themeId).map(copy)
  }

  private byTheme(themeId: string): PublishedSnapshot[] {
    return this.snapshots
      .filter((snapshot) => snapshot.themeId === themeId)
      .sort((a, b) => a.version - b.version)
  }
}

function copy(snapshot: PublishedSnapshot): PublishedSnapshot {
  return { ...snapshot, content: structuredClone(snapshot.content) }
}
