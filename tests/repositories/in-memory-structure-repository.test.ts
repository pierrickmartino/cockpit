import { randomUUID } from 'node:crypto'
import { InMemoryStructureRepository } from '@/repositories/in-memory-structure-repository'
import { runStructureRepositoryContract } from '../contract/structure-repository.contract'

runStructureRepositoryContract('InMemoryStructureRepository', async () => ({
  repository: new InMemoryStructureRepository(),
  // The fake enforces no theme foreign key, so any id stands in for a theme.
  themeId: randomUUID(),
}))
