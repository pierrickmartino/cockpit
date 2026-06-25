import { describe, expect, it } from 'vitest'
import type { SnapshotContent } from '@/domain/snapshot'
import type { SnapshotRepository } from '@/repositories/snapshot-repository'

/** A fresh, empty repository bound to a freshly-seeded, valid theme id. */
export interface SnapshotContractContext {
  repository: SnapshotRepository
  themeId: string
  /** A second valid theme id, so per-theme scoping/versioning can be exercised. */
  otherThemeId: string
}

const ABSENT_THEME = '00000000-0000-0000-0000-000000000000'

/** Minimal but representative frozen content for a published snapshot. */
function content(actorId: string): SnapshotContent {
  return {
    actors: [
      { id: actorId, name: 'TSMC', kind: 'point', actorKey: 'TSM', tier: 'foundry', location: null },
    ],
    flows: [],
    power: { [actorId]: { raw: 0, normalized: 0 } },
    citations: [],
    bindings: [],
  }
}

/**
 * The behavioural contract every SnapshotRepository must satisfy. The fake and
 * the Postgres implementation run this exact suite, so they cannot drift apart.
 * The central guarantee is immutability: publishing never mutates a prior
 * snapshot (ADR-0012) — republishing only appends a new version.
 */
export function runSnapshotRepositoryContract(
  name: string,
  createContext: () => Promise<SnapshotContractContext>,
): void {
  describe(`SnapshotRepository contract: ${name}`, () => {
    it('publishes the first snapshot of a theme as version 1', async () => {
      const { repository, themeId } = await createContext()

      const snapshot = await repository.publish(themeId, content('a'))

      expect(snapshot.id).toBeTruthy()
      expect(snapshot.themeId).toBe(themeId)
      expect(snapshot.version).toBe(1)
      expect(snapshot.content).toEqual(content('a'))
      expect(snapshot.publishedAt).toBeInstanceOf(Date)
    })

    it('returns null from findLatest when a theme has no published snapshot', async () => {
      const { repository, themeId } = await createContext()

      expect(await repository.findLatest(themeId)).toBeNull()
      expect(await repository.findLatest(ABSENT_THEME)).toBeNull()
    })

    it('findLatest returns the most recently published version', async () => {
      const { repository, themeId } = await createContext()
      await repository.publish(themeId, content('a'))
      await repository.publish(themeId, content('b'))

      const latest = await repository.findLatest(themeId)

      expect(latest?.version).toBe(2)
      expect(latest?.content).toEqual(content('b'))
    })

    it('republishing appends a new version without mutating prior snapshots', async () => {
      const { repository, themeId } = await createContext()
      const first = await repository.publish(themeId, content('a'))
      await repository.publish(themeId, content('b'))

      const all = await repository.listByTheme(themeId)

      expect(all.map((s) => s.version)).toEqual([1, 2])
      // The prior snapshot is untouched: same id, same frozen content.
      const reloadedFirst = all.find((s) => s.version === 1)
      expect(reloadedFirst?.id).toBe(first.id)
      expect(reloadedFirst?.content).toEqual(content('a'))
    })

    it('versions snapshots independently per theme', async () => {
      const { repository, themeId, otherThemeId } = await createContext()
      await repository.publish(themeId, content('a'))
      const other = await repository.publish(otherThemeId, content('b'))

      // Each theme's version sequence starts at 1, isolated from the other.
      expect(other.version).toBe(1)
      expect((await repository.findLatest(themeId))?.version).toBe(1)
      expect(await repository.listByTheme(otherThemeId)).toHaveLength(1)
    })

    it('isolates stored content so callers cannot mutate a published snapshot', async () => {
      const { repository, themeId } = await createContext()
      const input = content('a')

      await repository.publish(themeId, input)
      input.actors[0].name = 'MUTATED'

      const latest = await repository.findLatest(themeId)
      expect(latest?.content.actors[0].name).toBe('TSMC')
    })
  })
}
