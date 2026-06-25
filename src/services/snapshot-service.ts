import { fail, ok } from '@/api/response'
import type { PublishedSnapshot } from '@/domain/published-snapshot'
import { buildSnapshot } from '@/domain/snapshot'
import type { SnapshotRepository } from '@/repositories/snapshot-repository'
import type { StructureRepository } from '@/repositories/structure-repository'
import type { ServiceResult } from '@/services/service-result'

/**
 * Publish a theme: read its working structure, freeze the accepted-only state
 * into a snapshot via the pure builder (ADR-0012/0019), and persist it as the
 * theme's next immutable version. Returns a 201 success envelope with the new
 * snapshot. The same `buildSnapshot` runs here as in the workbench preview, so
 * what the Admin previews is exactly what publishes.
 */
export async function publishTheme(
  structureRepository: StructureRepository,
  snapshotRepository: SnapshotRepository,
  themeId: string,
): Promise<ServiceResult<PublishedSnapshot>> {
  const [actors, flows] = await Promise.all([
    structureRepository.listActors(themeId),
    structureRepository.listFlows(themeId),
  ])

  const content = buildSnapshot({ actors, flows })
  const snapshot = await snapshotRepository.publish(themeId, content)
  return { status: 201, body: ok(snapshot) }
}

/**
 * Read a theme's latest published snapshot for the Viewer. Returns a 200 success
 * envelope, or a clean 404 when the theme has not been published yet. Reads
 * never mutate published state (immutability, ADR-0012).
 */
export async function getPublishedSnapshot(
  snapshotRepository: SnapshotRepository,
  themeId: string,
): Promise<ServiceResult<PublishedSnapshot>> {
  const snapshot = await snapshotRepository.findLatest(themeId)
  if (!snapshot) {
    return { status: 404, body: fail('Theme has not been published yet') }
  }

  return { status: 200, body: ok(snapshot) }
}
