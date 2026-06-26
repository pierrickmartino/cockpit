/**
 * A Flow is a directed dependency edge between two Actors in a theme. It carries
 * `substitutability` — how replaceable the dependency is — which feeds the power
 * computation (centrality weighted by substitutability). Normalised to [0, 1]:
 * 0 means no substitute (a hard structural chokepoint), 1 means freely
 * substitutable.
 */
import type { Citation } from '@/domain/citation'
import type { ReviewStatus } from '@/domain/review'

export interface Flow {
  id: string
  themeId: string
  fromActorId: string
  toActorId: string
  substitutability: number
  /** Accept-gate status; a Flow enters `proposed` and is reviewed (ADR-0004). */
  status: ReviewStatus
  /** Per-claim citations grounding this flow; empty when nothing is sourced yet. */
  citations: Citation[]
  createdAt: Date
}

/** The fields an Admin supplies to add a Flow to a theme's working state. */
export interface NewFlow {
  themeId: string
  fromActorId: string
  toActorId: string
  substitutability: number
  /** Per-claim citations to attach; defaults to an empty list when omitted. */
  citations?: Citation[]
}
