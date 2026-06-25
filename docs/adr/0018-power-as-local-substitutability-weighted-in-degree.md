# Power is a local, substitutability-weighted in-degree (v1)

An actor's **power** is computed as the sum of `(1 − substitutability)` over its
**incoming** dependency flows. Flows point from the dependent actor to the actor
it depends on (see `CONTEXT.md`), so an actor's power measures how much other
actors structurally depend on it, discounted by how replaceable each dependency
is: a sole-source dependency (`substitutability = 0`) contributes the full
`1.0`; a freely substitutable one (`1.0`) contributes nothing.

The computation is a pure function over a theme's subgraph (actors + flows), with
no I/O — the primary correctness surface for this domain concept. It lives in
`src/domain/power.ts` and is reused unchanged anywhere power is needed (the
workbench preview computes it client-side from the loaded working structure; the
publish/snapshot builder will later freeze the same computation server-side).

Definition, precisely:

- **Direction**: power accrues to the actor a flow points *at* (weighted
  in-degree). Decided in this session; `CONTEXT.md`'s `Flow` entry is the
  canonical statement of edge direction.
- **Edge weight**: `criticality = 1 − substitutability`, linear, in `[0, 1]`.
- **Aggregation**: parallel flows between the same pair **sum** (each is a
  separately-authored dependency); the core returns **raw** scores.
- **Normalization**: a separate helper max-normalizes to `[0, 1]` per theme
  (theme-relative, since themes are isolated — ADR-0005); all-zero in → all-zero
  out, no divide-by-zero.
- **Coverage**: every actor is scored; actors with no incoming flows score `0`.

## Why this and not the alternatives

We deliberately chose the **transparent floor** over a more sophisticated metric,
per the PRD's stated risk ("start with a transparent centrality/chokepoint
metric; iterate"). Power is user-facing and gets frozen into published snapshots,
so the metric is hard to change quietly later — recording the choice here lets a
future reader see it was deliberate, not naïve.

Two richer alternatives were considered and **deferred** (see
`docs/exploratory.md`), not rejected:

- **Propagating centrality** (weighted PageRank / Katz) would capture the
  second-order chokepoint — the supplier-of-the-supplier — which the local metric
  misses. Deferred for cycle handling and loss of human-checkable scores.
- **Non-linear weighting** (`(1 − substitutability)^k`) would let a true single
  point of failure tower over a merely-tight dependency. Deferred for lack of a
  principled exponent and reduced interpretability.

Adopt either once real themes show the local/linear metric mis-ranking actual
chokepoints.
