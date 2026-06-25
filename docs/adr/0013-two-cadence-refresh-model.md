# Two refresh cadences: Admin-set ingestion, Viewer-chosen view refresh

There are two independent clocks, and the original "configurable interval" idea
conflated them:

- **Ingestion cadence** (Cockpit → provider): how often Cockpit pulls fresh
  prices/news into the live overlay. Costs money and burns provider rate limits.
  Set by the Admin per source binding (admin panel).
- **View refresh cadence** (browser → Cockpit): how often a Viewer's screen
  re-fetches the live overlay. Cheap (hits Cockpit's own data). Chosen by the
  Viewer as client-side view state, no account needed (consistent with ADR-0009).

A Viewer's refresh can never be fresher than ingestion — polling every 10 min is
pointless on an hourly-ingested source. So the Admin additionally defines, per
binding, the **menu** of view-refresh options offered to Viewers (e.g. allow
30/60 only, not 10), narrowing end-user choice on purpose. The Viewer picks from
that menu; the UI never offers an option finer than ingestion supports.

We rejected a single global interval (it would have to be either Admin-only,
losing the per-viewer choice, or Viewer-only, ignoring provider cost/limits) in
favor of two knobs at two layers with the Admin setting the floor and the menu.
