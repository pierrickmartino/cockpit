# Exploratory ideas

Deferred / not-yet-adopted ideas. Things we deliberately chose *not* to build in
v1 but want to revisit. Nothing here is committed.

## Power computation

### Non-linear substitutability weighting

v1 weights each dependency flow linearly: `criticality = 1 − substitutability`.
This treats a sole-source supplier (`substitutability = 0`) as only 2× the
leverage of a "two suppliers exist" one (`substitutability ≈ 0.5`).

A non-linear curve — e.g. `criticality = (1 − substitutability)^k` with `k > 1`
— would make near-zero substitutability dominate, so a true single point of
failure towers over a merely-tight dependency rather than scaling linearly.

Deferred because it introduces a tunable exponent with no principled default and
hurts interpretability. Revisit if real themes produce rankings where
sole-source chokepoints feel under-weighted relative to substitutable ones.

### Propagating power (transitive centrality)

v1 computes power as a purely *local* weighted in-degree: an actor's score is the
sum of `(1 − substitutability)` over its incoming flows only. This misses the
**second-order chokepoint** — if everyone depends on TSMC and only TSMC depends
on ASML, ASML scores low despite being the deepest structural chokepoint.

A propagating metric — weighted PageRank or Katz centrality over the
dependency graph — would let power flow transitively, so a supplier inherits
leverage from the powerful actors that depend on it. Deferred because it needs
damping/iteration and cycle handling, and the scores stop being human-checkable
(tests become "trust the eigenvector" rather than arithmetic). Adopt once the
local metric demonstrably under-ranks deep upstream chokepoints on real themes.
