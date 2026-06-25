# MapLibre GL JS as the map engine; deck.gl reserved for flow-arcs

The map is rendered with MapLibre GL JS over a free hosted vector tile/style
source (e.g. OpenFreeMap or Protomaps), self-hosted later if volume demands. It
covers the entire v1 surface — choropleth place-actors, point-actor pins, hover
tooltips, click panels. deck.gl is reserved for when dependency flow-arcs
graduate from the actor panel onto the map (the dual-view future of ADR-0002);
it overlays on the same MapLibre basemap, so adding it is not a migration.

The map engine is sticky — tooltips, styling, and interaction are written
against its API, so swapping it is a rewrite. We chose open and free over
Mapbox GL JS, whose per-map-load pricing and proprietary token dependency buy
polish we don't need yet, and over D3+TopoJSON, which would mean hand-building a
mapping engine. Starting on deck.gl now was rejected because flows-on-map are a
later phase and deck.gl on its own is a heavier basemap story.
