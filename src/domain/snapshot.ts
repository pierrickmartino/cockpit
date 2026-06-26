import { acceptedStructure } from '@/domain/accept-gate'
import type { ActorKind } from '@/domain/actor'
import type { Citation } from '@/domain/citation'
import { computePower, normalizePower } from '@/domain/power'
import type { WorkingStructure } from '@/domain/structure'

/**
 * An Actor as frozen into a published snapshot: only the fields that are static
 * at publish time (ADR-0012). Authoring-state fields — review `status` (all
 * accepted by construction), `themeId`, and `createdAt` — are dropped.
 */
export interface SnapshotActor {
  id: string
  name: string
  kind: ActorKind
  actorKey: string
  tier: string | null
  location: string | null
}

/** A Flow as frozen into a published snapshot (structure only). */
export interface SnapshotFlow {
  id: string
  fromActorId: string
  toActorId: string
  substitutability: number
}

/** Per-actor power frozen at publish: structural, not recomputed per read (ADR-0012). */
export interface SnapshotActorPower {
  raw: number
  normalized: number
}

/**
 * A Citation frozen into a snapshot, tagged with the accepted element it grounds
 * so the viewer-facing review surface (a later slice) can show what backs each
 * actor or flow without re-joining against authoring tables. "Unsourced" is never
 * stored — it stays derivable from the absence of a citation for a given claim.
 */
export type SnapshotCitation = Citation & {
  target: 'actor' | 'flow'
  elementId: string
}

/**
 * The immutable, frozen content of a published snapshot: the accepted-only
 * structure, computed power, and placeholders for citations and source bindings
 * (filled by later slices). This is the jsonb the Viewer reads.
 */
export interface SnapshotContent {
  actors: SnapshotActor[]
  flows: SnapshotFlow[]
  /** Computed power keyed by actor id (raw + theme-normalized). */
  power: Record<string, SnapshotActorPower>
  /** Citations frozen from accepted elements; viewer-facing display lands later (ADR-0004). */
  citations: SnapshotCitation[]
  /** Source bindings; live overlay wiring lands in a later slice (ADR-0011/0012). */
  bindings: never[]
}

/**
 * The publish/snapshot builder (PRD module 2): freeze a theme's working state
 * into immutable published content. Pure — no I/O, no mutation.
 *
 * Only the **accepted** structure reaches the snapshot (accept-gate, ADR-0019):
 * the same `acceptedStructure` projection the workbench preview renders, so what
 * an Admin previews is exactly what publishes. Power is computed over that
 * accepted subgraph and frozen here (structural, not per-read; ADR-0012).
 * Each accepted element's per-claim citations are frozen too, tagged with the
 * owning element. Bindings remain a placeholder for a later slice.
 */
export function buildSnapshot(structure: WorkingStructure): SnapshotContent {
  const accepted = acceptedStructure(structure)
  const raw = computePower(accepted)
  const normalized = normalizePower(raw)

  const power: Record<string, SnapshotActorPower> = {}
  for (const actor of accepted.actors) {
    power[actor.id] = {
      raw: raw[actor.id] ?? 0,
      normalized: normalized[actor.id] ?? 0,
    }
  }

  const citations: SnapshotCitation[] = [
    ...accepted.actors.flatMap((actor) =>
      actor.citations.map((citation) => ({ target: 'actor' as const, elementId: actor.id, ...citation })),
    ),
    ...accepted.flows.flatMap((flow) =>
      flow.citations.map((citation) => ({ target: 'flow' as const, elementId: flow.id, ...citation })),
    ),
  ]

  return {
    actors: accepted.actors.map((actor) => ({
      id: actor.id,
      name: actor.name,
      kind: actor.kind,
      actorKey: actor.actorKey,
      tier: actor.tier,
      location: actor.location,
    })),
    flows: accepted.flows.map((flow) => ({
      id: flow.id,
      fromActorId: flow.fromActorId,
      toActorId: flow.toActorId,
      substitutability: flow.substitutability,
    })),
    power,
    citations,
    bindings: [],
  }
}
