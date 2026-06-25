import type { WorkingStructure } from '@/domain/structure'

/**
 * Per-actor power, keyed by actor id. Power measures how much the rest of a
 * theme structurally depends on an actor, discounted by how replaceable each
 * dependency is (ADR-0018). Higher means a stronger chokepoint.
 */
export type PowerScores = Record<string, number>

/**
 * Compute raw power for every actor in a theme's working structure.
 *
 * An actor's power is the sum of `(1 − substitutability)` over its incoming
 * flows. Flows point from the dependent actor to the actor it depends on
 * (CONTEXT.md), so power accrues to the actor a flow points at — a local,
 * non-propagating weighted in-degree (ADR-0018). Pure: no I/O.
 */
export function computePower(structure: WorkingStructure): PowerScores {
  const scores: PowerScores = {}
  for (const actor of structure.actors) {
    scores[actor.id] = 0
  }
  for (const flow of structure.flows) {
    scores[flow.toActorId] += 1 - flow.substitutability
  }
  return scores
}

/**
 * Max-normalize raw power scores into `[0, 1]` within a single theme: the
 * highest-scoring actor becomes `1`, the rest scale proportionally. Normalization
 * is theme-relative (themes are isolated, ADR-0005) and kept separate from
 * {@link computePower} so the raw scores stay composable. When every score is
 * zero the scores are returned unchanged — no divide-by-zero.
 */
export function normalizePower(scores: PowerScores): PowerScores {
  const max = Math.max(0, ...Object.values(scores))
  if (max === 0) {
    return { ...scores }
  }
  const normalized: PowerScores = {}
  for (const [actorId, score] of Object.entries(scores)) {
    normalized[actorId] = score / max
  }
  return normalized
}
