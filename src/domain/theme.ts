/**
 * A Theme is a content/subject area that scopes one graph (e.g. AI, energy).
 * In the walking skeleton a Theme is empty: it only carries identity, a title,
 * and its authoring ("working") state. Published snapshots are added later.
 */

/** The lifecycle state of a Theme. v1 authoring starts in `working`. */
export type ThemeState = 'working'

export interface Theme {
  id: string
  title: string
  state: ThemeState
  createdAt: Date
}

/** The fields an Admin supplies to create a Theme. */
export interface NewTheme {
  title: string
}
