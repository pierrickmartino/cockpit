import type { SnapshotActor, SnapshotContent } from '@/domain/snapshot'

interface PublishedSnapshotViewProps {
  content: SnapshotContent
}

/**
 * Read-only Viewer rendering of a published snapshot's frozen content: actors,
 * dependency flows, and the power ranking. Reads only — it never mutates the
 * published state (ADR-0012). The MapLibre map and live overlay land in later
 * slices; this is the structural read the publish→view loop closes on.
 */
export function PublishedSnapshotView({ content }: PublishedSnapshotViewProps) {
  const actorName = (id: string) =>
    content.actors.find((actor: SnapshotActor) => actor.id === id)?.name ?? id

  const ranked = content.actors
    .map((actor) => ({ actor, power: content.power[actor.id] ?? { raw: 0, normalized: 0 } }))
    .sort((a, b) => b.power.raw - a.power.raw)

  return (
    <div data-testid="published-view">
      <h2>Power</h2>
      <ol data-testid="published-power-ranking">
        {ranked.map(({ actor, power }) => (
          <li key={actor.id} data-testid="published-power-item">
            {actor.name} — {Math.round(power.normalized * 100)}% ({power.raw.toFixed(2)})
          </li>
        ))}
      </ol>

      <h2>Actors ({content.actors.length})</h2>
      <ul>
        {content.actors.map((actor) => (
          <li key={actor.id} data-testid="published-actor-item">
            {actor.name} ({actor.kind})
            {actor.tier ? ` — ${actor.tier}` : ''}
          </li>
        ))}
      </ul>

      <h2>Flows ({content.flows.length})</h2>
      <ul>
        {content.flows.map((flow) => (
          <li key={flow.id} data-testid="published-flow-item">
            {actorName(flow.fromActorId)} → {actorName(flow.toActorId)} (substitutability{' '}
            {flow.substitutability})
          </li>
        ))}
      </ul>
    </div>
  )
}
