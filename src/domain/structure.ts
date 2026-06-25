import type { Actor } from '@/domain/actor'
import type { Flow } from '@/domain/flow'

/**
 * The current authored structure of a theme's working state — the model the
 * workbench preview renders. Published snapshots freeze a derived form of this
 * later (ADR-0012); here it is the live, editable authoring state.
 */
export interface WorkingStructure {
  actors: Actor[]
  flows: Flow[]
}
