/**
 * A Citation grounds a single factual Claim an actor or flow makes about the
 * world in a real, retrieved web source (CONTEXT.md / ADR-0021). It carries the
 * retrieved snippet (`quotedText`), not just a link, so the Admin reviews actual
 * source content rather than an invented reference. Citations are stored as a
 * jsonb list on their owning element and frozen into the published snapshot.
 */

/**
 * The citable claims. An actor asserts `relevance` (why it belongs in the
 * theme), and optionally `tier` and `location`; a flow asserts `dependency`
 * (that the dependency exists) and `substitutability`. Identity-like attributes
 * (`actorKey`, an actor's `kind`) are lookups, not claims, and carry no citation.
 */
export type Claim = 'relevance' | 'tier' | 'location' | 'dependency' | 'substitutability'

export interface Citation {
  /** The single claim this source grounds. */
  claim: Claim
  /** The source URL. */
  url: string
  /** The source's title. */
  title: string
  /** The exact retrieved snippet that backs the claim. */
  quotedText: string
}
