import { randomUUID } from 'node:crypto'
import { InMemorySnapshotRepository } from '@/repositories/in-memory-snapshot-repository'
import { runSnapshotRepositoryContract } from '../contract/snapshot-repository.contract'

runSnapshotRepositoryContract('InMemorySnapshotRepository', async () => ({
  repository: new InMemorySnapshotRepository(),
  themeId: randomUUID(),
  otherThemeId: randomUUID(),
}))
