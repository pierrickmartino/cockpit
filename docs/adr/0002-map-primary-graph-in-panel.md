# Map-primary, dependency graph lives in the actor panel (v1)

The viewer's home view is the world map (choropleth of indicators by region,
actors as pins). The dependency graph — the node-link view that makes
supply-chain dependence and chokepoints legible — lives inside the panel that
opens when a viewer clicks an actor, showing that actor's upstream/downstream
flows rather than a global graph.

Geography hides topology: a chokepoint like ASML is a property of edges, not
coordinates, so "where power lies" is a graph question. We still lead with the
map because the product is anchored on an interactive map (hover→tooltip,
click→panel) and a global node-link graph of an entire theme is a legibility and
layout problem we don't want in v1. We rejected graph-primary (fights the map
vision) and dual linked map+graph views (the impressive end state, but defer the
global-layout problem). The model is built so dual linked views remain reachable
later.
