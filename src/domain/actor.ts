/**
 * An Actor is a node in a theme's graph — a company, country/region, data
 * centre, or institution. Within a theme's working state it is authored
 * manually by the Admin (no generation yet). Identity is shared across isolated
 * themes only by `actorKey` (ADR-0005); the graphs themselves stay separate.
 */

/** How an Actor anchors on the map: an area (choropleth) vs a pin (CONTEXT.md). */
export type ActorKind = 'place' | 'point'

export interface Actor {
  id: string
  themeId: string
  /** Human-readable label, e.g. "TSMC" or "Taiwan". */
  name: string
  /** place-actor (area) vs point-actor (single canonical location). */
  kind: ActorKind
  /** Stable cross-theme identifier, e.g. a ticker or ISO country code. */
  actorKey: string
  /** Role/standing within the theme; null until a tier is assigned. */
  tier: string | null
  /** Canonical location label (area for place-actors, site for point-actors). */
  location: string | null
  createdAt: Date
}

/** The fields an Admin supplies to add an Actor to a theme's working state. */
export interface NewActor {
  themeId: string
  name: string
  kind: ActorKind
  actorKey: string
  tier?: string | null
  location?: string | null
}
