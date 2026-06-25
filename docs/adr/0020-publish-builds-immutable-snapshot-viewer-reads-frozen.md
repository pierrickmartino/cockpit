# Publishing freezes accepted state into an immutable, versioned snapshot; the viewer reads it

This realizes the frozen-structure half of ADR-0012 and closes the
author→publish→view loop (issue #8).

- **Pure snapshot builder** (`src/domain/snapshot.ts`, PRD module 2):
  `buildSnapshot(workingStructure) → SnapshotContent`. It runs the **same**
  `acceptedStructure` projection the workbench preview renders (ADR-0019), so what
  the Admin previews is exactly what publishes, then freezes computed power
  (ADR-0018) over that accepted subgraph. Authoring-state fields (`status`,
  `themeId`, `createdAt`) are dropped; `citations` and `bindings` are empty-array
  placeholders filled by later slices. Pure, no I/O — the primary correctness
  surface, unit tested for accepted-only projection, field freezing, endpoint
  coherence, power, and placeholders.

- **Immutable persistence**: `published_snapshots` is append-only jsonb, one row
  per version. `SnapshotRepository.publish` assigns the next per-theme version
  (1-based) and never updates a prior row; a unique `(theme_id, version)`
  constraint enforces a single gap-free sequence. Republishing creates a new
  version, leaving prior snapshots byte-for-byte unchanged. The fake and the
  Postgres repo share one contract suite whose central assertion is that
  immutability (ADR-0012).

- **Viewer reads the frozen snapshot, not the working state**: the publish route
  (`POST /api/themes/[id]/publish`) is admin-guarded (ADR-0009); the viewer route
  is public and renders `findLatest`'s content. Because the snapshot froze
  accepted-only state at publish time, later unaccepted/unpublished working edits
  cannot leak to viewers — proven end-to-end (author → accept subset → publish →
  view, plus a post-publish edit the viewer never sees).

## Why this and not the alternatives

Power is computed **once at publish** and frozen, not recomputed per read — power
is structural (ADR-0012/0018); making it react to live values is a deliberate
future change, not a v1 default. The service layer is the only adapter: it reads
the working structure, runs the pure `buildSnapshot`, and persists the result, so
the tested builder and the wired publish path cannot drift. Publishing an empty
or unknown theme is left ungoverned this slice (the Admin always publishes from a
workbench bound to a real theme); a theme-existence guard is a cheap follow-up if
the publish route is ever reachable without one.
