# Accept-gate is a one-way reducer over a per-element status; the preview is accepted-only

The **accept-gate** (`CONTEXT.md`, ADR-0004) is implemented as a pure reducer in
`src/domain/accept-gate.ts`. Every actor and flow carries a `status` of
`proposed | accepted | rejected`. `applyReview(structure, actions)` takes a batch
of Admin accept/reject decisions and returns the resulting working structure;
`acceptedStructure(structure)` projects the accepted-only view the workbench
preview renders. Both are pure (no I/O) — the primary correctness surface, unit
tested for accept, reject, mixed batches, idempotency, immutability, and
endpoint coherence.

Definition, precisely:

- **Entry state**: actors and flows are persisted as `proposed`. Manual authoring
  (#5) stands in for AI-generated proposals until generation lands, so the gate
  is exercised end-to-end now rather than waiting on the generator.
- **One-way transitions**: a decision only moves an element that is still
  `proposed`; `accepted`/`rejected` are terminal. This makes the reducer
  idempotent (re-applying a batch is a no-op) and gives well-defined mixed
  batches. Re-review / undo is deliberately **deferred** — the issue asked only
  for create-proposed and accept-or-reject.
- **Last-decision-wins** within a single batch, so a batch naming the same
  element twice is unambiguous; decisions naming an unknown element are no-ops.
- **Accepted-only preview**: `acceptedStructure` keeps accepted actors and
  accepted flows whose **both** endpoints are accepted, so the preview never
  dangles to a non-accepted actor. Power is computed over this accepted subgraph,
  not the raw working set.

## Why this and not the alternatives

The reducer is pure and the service is the only adapter: `reviewStructure` runs
the same `applyReview` in production and persists just the statuses that changed,
so the tested logic and the wired logic cannot drift. Returning the full working
structure (with statuses) from the review endpoint lets the workbench refresh
both its review queue and its accepted-only preview from one response.

A **mutable, re-reviewable** status (flip accepted↔rejected at will) was
considered and deferred: it adds undo semantics and UI not asked for in this
slice, and a one-way gate is the simpler honest model of "the Admin reviewed
this." Adopt re-review when authoring shows a real need to correct a decision
without recreating the element.

Snapshots are unaffected here: publishing freezes the **accepted** state, and the
publish/snapshot builder (a later slice) will reuse `acceptedStructure` server-side
the same way the preview uses it client-side.
