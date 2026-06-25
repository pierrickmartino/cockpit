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
A content/subject area that scopes one graph (e.g. AI, energy). Themes are
isolated graphs — an actor authored in one is independent of the same real-world
entity in another. Each published Theme is its own Viewer destination; Viewers
land on one and do not switch between Themes. Its colors and organization come
from a bound Presentation, not a separate user choice.
_Avoid_: Topic, category, domain. (Never use "theme" for visual styling — that is
Presentation.)

**Presentation**:
The visual and organizational config bound to a Theme by the Admin — palette,
tier→color mapping, default-visible layers/filters, and default map framing.
Frozen into the published snapshot. Not a separately selectable "design theme":
choosing a Theme is choosing its content, and the Presentation comes with it.
_Avoid_: Design theme, skin, style.

**Generation model**:
The LLM that assists the Admin in building a theme's graph. Runs with web search
and fetch so its claims are grounded in real retrieved sources. An
authoring-time tool, never invoked at view time.
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

**Actor key**:
A stable cross-theme identifier stamped on every actor (e.g. a ticker or ISO
country code) so the same real-world entity can be recognized across isolated
themes. Identity is shared by key only; the graphs themselves stay separate.
_Avoid_: Global id, registry id.

**Flow**:
A directed edge between actors expressing a relationship — supplies,
invests-in, depends-on, exports-to. Flows carry the supply-chain dependency
structure. A flow records how substitutable the dependency is (can it be sourced
elsewhere?), which feeds the power computation.
_Avoid_: Edge, link, connection.

**Indicator**:
A named, quantitative measure attached to an actor or a place (market cap,
capex, capacity, investment). The part of the graph that automated ingestion
refreshes on an interval; everything structural is fixed at publish time. Values
are kept as an append-only history so trends are recoverable, even though v1 only
renders the latest value.
_Avoid_: Metric, data point, stat.

**Tier**:
An actor's role or standing within a theme. For point-actors it expresses a
function (e.g. the lithography tier in the AI theme); for place-actors it
expresses leadership (e.g. leader / fast-follower / emerging) — this is what
"most advanced region" means. Admin-authored and accepted with a citation, never
a computed composite score. Drives grouping and color.
_Avoid_: Layer, category, rank, score.

**Power**:
The property of an actor being upstream of many flows with few substitutes — a
structural chokepoint (e.g. ASML, TSMC). Computed from the graph (centrality
weighted by flow substitutability), proposed to the Admin, and accepted like any
other claim. Identifying where power concentrates is the central purpose of the
dashboard.
_Avoid_: Importance, influence.

**Feed**:
A per-actor stream of dated, sourced textual items (e.g. news) attached to an
actor. Distinct from Indicator (numeric) — a Feed is a timeline of events, not a
value, and unlike Indicators it is retention-bounded (recent items only), not
kept forever. Populated by automated ingestion from a news provider, stored raw
(title, summary, url, source, timestamp); any sentiment is provider-supplied and
attributed, never Cockpit's own. Rendered as a timeline in the actor panel.
_Avoid_: News, timeline, stream (unqualified).

**Filter**:
A viewer control that removes actors, flows, or indicators from the current
view by some criterion (tier, type, indicator threshold) to declutter. Filters
hide; they never change the published graph.
_Avoid_: Toggle, layer switch.

### Authoring loop

**Proposal**:
An actor or flow the generation model suggests during a conversational build. It
enters the graph as *proposed* and is not part of any snapshot until the Admin
accepts it.
_Avoid_: Suggestion, draft element.

**Accept-gate**:
The rule that no proposal becomes part of a snapshot until the Admin explicitly
accepts it. Every actor and flow carries a review status (proposed / accepted /
rejected).
_Avoid_: Approval flow.

**Source binding**:
An Admin-accepted mapping from an actor to a live data source — e.g. price from a
ticker on a market-data provider, or a Feed from a query on a news source. The
accept-gate applies to the binding (accepted once), not to each value or item
that flows through it. A binding also sets the ingestion cadence and the set of
view-refresh options offered to Viewers.
_Avoid_: Connection, integration, mapping.

**Ingestion cadence**:
How often Cockpit pulls a source binding's data from the upstream provider into
the live overlay. Admin-set per binding; bounded by provider cost and rate
limits.
_Avoid_: Poll rate, sync interval.

**View refresh cadence**:
How often a Viewer's browser re-fetches the live overlay from Cockpit. The Viewer
chooses from a set of options the Admin allows per binding; never finer than the
ingestion cadence.
_Avoid_: Poll rate, auto-refresh.

**Citation**:
A reference to a real, retrieved web source attached to a factual claim about an
actor or flow. Produced by grounded generation (the model searches and fetches
before asserting), so the Admin reviews actual source content rather than an
invented link. Stored always; viewer-facing display is deferred.
_Avoid_: Source link, reference (unqualified), footnote.

**Workbench**:
The Admin's authoring surface: a conversation panel with the generation model, a
structured review surface (the proposed→accepted queue with inline citations and
forms for location, tiers, actor key, and source bindings), and a live preview of
the map and dependency graph. Editing happens in the structured surface; the map
is preview and pin-placement only.
_Avoid_: Editor, dashboard (for the Admin surface).
