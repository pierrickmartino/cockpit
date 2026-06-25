import { InMemoryThemeRepository } from '@/repositories/in-memory-theme-repository'
import { runThemeRepositoryContract } from '../contract/theme-repository.contract'

runThemeRepositoryContract('InMemoryThemeRepository', () => new InMemoryThemeRepository())
