import type { Actor } from '@/domain/actor'
import type { WorkingStructure } from '@/domain/structure'
import { acceptedStructure } from '@/domain/accept-gate'
import { computePower, normalizePower } from '@/domain/power'

/**
 * Read-only preview of a theme's working structure for the admin workbench.
 * Reflects accepted-only state (accept-gate, ADR-0004): proposed and rejected
 * elements are excluded so the preview shows what would publish. Ranks the
 * accepted actors by computed power (ADR-0018) so the admin can see which
 * actors are structural chokepoints as they author.
 */
export function StructurePreview(structure: WorkingStructure) {
  const { actors, flows } = acceptedStructure(structure)
  const actorName = (id: string) => actors.find((actor: Actor) => actor.id === id)?.name ?? id

  const raw = computePower({ actors, flows })
  const normalized = normalizePower(raw)
  const ranked = actors
    .map((actor) => ({
      actor,
      raw: raw[actor.id] ?? 0,
      normalized: normalized[actor.id] ?? 0,
    }))
    .sort((a, b) => b.raw - a.raw)

  return (
    <div data-testid="structure-preview">
      <h3>Preview</h3>

      <h4>Power</h4>
      <ol data-testid="power-ranking">
        {ranked.map(({ actor, raw: rawScore, normalized: normalizedScore }) => (
          <li key={actor.id} data-testid="power-item">
            {actor.name} — {Math.round(normalizedScore * 100)}% ({rawScore.toFixed(2)})
          </li>
        ))}
      </ol>

      <h4>Actors ({actors.length})</h4>
      <ul>
        {actors.map((actor) => (
          <li key={actor.id} data-testid="actor-item">
            {actor.name} ({actor.kind})
            {actor.tier ? ` — ${actor.tier}` : ''}
          </li>
        ))}
      </ul>

      <h4>Flows ({flows.length})</h4>
      <ul>
        {flows.map((flow) => (
          <li key={flow.id} data-testid="flow-item">
            {actorName(flow.fromActorId)} → {actorName(flow.toActorId)} (substitutability{' '}
            {flow.substitutability})
          </li>
        ))}
      </ul>
    </div>
  )
}
