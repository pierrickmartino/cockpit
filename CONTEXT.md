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
