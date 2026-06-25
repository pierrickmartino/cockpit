# Frozen-structure + live-overlay read model (revises ADR-0006, 0003, 0008)

Live data (Indicators, Feeds) is in v1 scope, reversing the "ingestion deferred"
stance of ADR-0003, ADR-0006, and ADR-0008. The read model splits in two:

- The published `jsonb` snapshot freezes only what is static at publish time —
  actors, flows, tiers, canonical locations, accepted citations, computed power,
  and the source bindings. One fast, atomic, versioned read.
- A live overlay (normal Postgres tables keyed by actor id / `actorKey`, written
  by ingestion) holds the moving parts: latest Indicator values (append-only per
  ADR-0003) and Feed items.

At read time the Viewer fetches the frozen snapshot once, then the overlay is
merged on top. **Power stays structural** — computed at publish from structure,
not recomputed per tick; making power react to live values (e.g. price-weighted
chokepoints) is a deliberate future change, not a v1 default.

This preserves everything ADR-0006 valued (atomic publish, fast structural read,
versioning, graph computation off the hot path) while giving live data a home. We
rejected re-freezing the whole graph on every tick (defeats publishing and
recomputes power needlessly) and putting live values in the jsonb (a frozen blob
can't carry a price from 30 seconds ago).
