# Cockpit

A dashboard that visualizes global geopolitical and economic interactions for a
chosen subject area, so a viewer can see the actors involved, the flows between
them, and where structural dependence concentrates.

## Language

### Roles

**Admin**:
The author of the content. Builds the graph for a theme with help from the
generation model, stores snapshots, and publishes a stable version for viewers.
_Avoid_: Editor, curator (when referring to the role).

**Viewer**:
A non-authoring user who consumes a published theme. Can choose themes, show or
hide content, and explore the map, but cannot generate or edit the graph.
_Avoid_: End user, consumer, client.

### Authoring

**Theme**:
A subject area that scopes one graph (e.g. AI, energy). Choosing a theme
determines which actors, flows, and data are shown, plus the dashboard's
organization and colors.
_Avoid_: Topic, category, domain.

**Generation model**:
The LLM that assists the Admin in building a theme's graph. An authoring-time
tool, never invoked at view time.
_Avoid_: AI, the model (unqualified).

**Snapshot**:
A stored version of a theme's graph produced during authoring. Admins generate
and keep snapshots as they work.
_Avoid_: Draft, save.

**Published version**:
The stable snapshot that viewers see. Publishing promotes a snapshot to the
viewer-facing state.
_Avoid_: Release, live version.

### Graph model

The graph is the single underlying structure; the map, panels, and filters are
all views over it.

**Actor**:
A node in the graph: a company, a country or region, a data center, an
institution. Has a type, a location, tiers, and indicators. Comes in two kinds —
place-actors and point-actors — that render differently on the map.
_Avoid_: Node, entity, data point.

**Place-actor**:
An actor that is an area (country, region). Rendered as a choropleth — the shape
filled by an indicator's value. Place-actors are the basemap.
_Avoid_: Territory, zone.

**Point-actor**:
An actor that sits at a location (company, data center, institution). Rendered
as a pin at a single canonical location chosen by the Admin at authoring time.
The map shows a point-actor's presence, not its power; its power is read from the
dependency graph in its panel.
_Avoid_: Marker, dot.

**Flow**:
A directed edge between actors expressing a relationship — supplies,
invests-in, depends-on, exports-to. Flows carry the supply-chain dependency
structure.
_Avoid_: Edge, link, connection.

**Indicator**:
A named, quantitative measure attached to an actor or a place (market cap,
capex, capacity, investment). The part of the graph that automated ingestion
refreshes on an interval; everything structural is fixed at publish time.
_Avoid_: Metric, data point, stat.

**Tier**:
An actor's role within a theme (e.g. the lithography tier in the AI theme).
Drives grouping and color.
_Avoid_: Layer, category, rank.

**Power**:
The property of an actor being upstream of many flows with few substitutes — a
structural chokepoint (e.g. ASML, TSMC). Identifying where power concentrates is
the central purpose of the dashboard.
_Avoid_: Importance, influence.

**Filter**:
A viewer control that removes actors, flows, or indicators from the current
view by some criterion (tier, type, indicator threshold) to declutter. Filters
hide; they never change the published graph.
_Avoid_: Toggle, layer switch.
