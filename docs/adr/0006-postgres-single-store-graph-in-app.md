# Single PostgreSQL store; graph computed in-app; published read model in jsonb

The system uses one PostgreSQL database. Actors and flows are relational tables
(a flow is a row with from/to actor ids); indicator history is an append-only
table. Graph work — multi-hop traversal and chokepoint/centrality ("where power
lies") — is done in-app by loading a theme's subgraph into an in-memory graph
library, not by a graph database. Publishing materializes the accepted graph,
computed power scores, and latest indicators into a `jsonb` read model so viewers
read one row with no live traversal.

A theme is isolated and small (hundreds of actors, depth ~2–3), so a graph
database buys nothing a library can't do in milliseconds, while costing a second
datastore to operate and breaking atomic publish-freeze. We rejected Neo4j/
Memgraph (justified only by large-scale or cross-theme topology, which Q8/ADR-0005
explicitly defers) and Apache AGE (graph ergonomics not yet worth the dependency).
The normalized tables are the authoring source of truth; the jsonb published
version is the read model — the read/write split this project already favors.
Computing power in-app also turns "where power lies" into a real, reviewable
metric rather than a hand-authored guess.

**Revised by ADR-0012:** the published `jsonb` no longer freezes indicator values.
It freezes only static structure (actors, flows, tiers, locations, citations,
source bindings) and computed power; live Indicator values and Feed items are
served from a live overlay and merged at read time.
