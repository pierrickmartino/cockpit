/**
 * Endpoint resolution (ADR-0021). A turn commonly proposes new actors *and* a
 * flow between them before either has a persisted UUID, so a proposed flow names
 * its endpoints by the model-supplied name/temp-id. Once the service has
 * persisted (or reused) the turn's actors and built a ref → UUID map, this maps
 * each flow's endpoints to real UUIDs.
 *
 * Persistence is best-effort: a flow whose endpoint will not resolve is
 * **dropped** (never backfilled with a synthesised, ungrounded actor) and
 * reported. A flow whose endpoints resolve to the same actor is dropped too — a
 * self-dependency would corrupt the power computation.
 */

import type { Citation } from '@/domain/citation'
import type { DroppedFlow, ProposedFlow } from '@/domain/generation'

/** A flow whose endpoints have been resolved to persisted actor UUIDs. */
export interface ResolvedFlow {
  fromActorId: string
  toActorId: string
  substitutability: number
  citations: Citation[]
}

/**
 * Resolve each flow's `fromRef`/`toRef` against the ref → actor-UUID map.
 * Returns the resolvable flows and, separately, those dropped because an
 * endpoint is unknown or both endpoints resolve to the same actor.
 */
export function resolveEndpoints(
  flows: ProposedFlow[],
  refToActorId: ReadonlyMap<string, string>,
): { resolved: ResolvedFlow[]; dropped: DroppedFlow[] } {
  const resolved: ResolvedFlow[] = []
  const dropped: DroppedFlow[] = []

  for (const flow of flows) {
    const fromActorId = refToActorId.get(flow.fromRef)
    const toActorId = refToActorId.get(flow.toRef)

    if (!fromActorId || !toActorId) {
      const missingRef = !fromActorId ? flow.fromRef : flow.toRef
      dropped.push({
        fromRef: flow.fromRef,
        toRef: flow.toRef,
        reason: `endpoint '${missingRef}' not found`,
      })
      continue
    }

    if (fromActorId === toActorId) {
      dropped.push({
        fromRef: flow.fromRef,
        toRef: flow.toRef,
        reason: 'flow endpoints resolve to the same actor',
      })
      continue
    }

    resolved.push({
      fromActorId,
      toActorId,
      substitutability: flow.substitutability,
      citations: flow.citations,
    })
  }

  return { resolved, dropped }
}
