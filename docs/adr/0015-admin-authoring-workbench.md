# Admin authoring is a three-part workbench, not map-primary editing

The Admin authors in a three-part workbench: (1) a conversation panel with the
generation model, (2) a structured review surface — the proposed→accepted queue
with inline citations and forms for the structured fields (canonical location,
tiers, `actorKey`, source bindings), and (3) a live preview of the map and the
in-panel dependency graph reflecting the working snapshot. Editing happens in the
structured surface; the map is a live preview and the natural place to drop a pin
for an actor's canonical location, not the editing canvas.

What is being authored is a graph with heavy structured metadata, built through
conversation — the accept-gate, citations, review statuses, and source bindings
(ADR-0004, ADR-0011) are structured review work a queue and forms handle and a
map cannot. But the Admin can't publish blind, so a live preview of the exact
Viewer experience sits alongside. We rejected map-primary WYSIWYG authoring: the
map is hostile to topology editing (flows as ocean-crossing lines), can't show
hundreds of proposals or per-claim citations, and has nowhere to edit
`actorKey`/tiers/bindings.
