# Generation produces per-claim-cited proposals through a no-persistence adapter, gated by a tiered grounding floor

This realizes issue #9 and makes concrete the data model and standard that
ADR-0004 (review status + citations) and ADR-0008 (web-grounded generation)
described but did not yet specify. The generation model converses with the
Admin and proposes actors and flows that enter the existing accept-gate
(ADR-0019) as `proposed`, each carrying citations the Admin reviews.

## The citation data model is per-claim, not per-element

CONTEXT.md says a citation backs "a factual claim about an actor or flow." An
actor bundles several claims, so a citation names *which* one it grounds. The
citable **Claims** are:

- **Actor**: `relevance` (why it belongs in the theme), `tier`, `location`
- **Flow**: `dependency` (that the dependency exists), `substitutability`

Identity-like attributes (`actorKey`, an actor's `kind`) are **not** claims —
they are lookups, not assertions about the world, and carry no citation. A
`Citation` records `{ claim, url, title, quotedText }`, where `quotedText` is the
retrieved snippet — storing the snippet, not just a link, is what lets the Admin
review real source content (ADR-0008). Each actor and flow carries
`citations: Citation[]`.

We rejected a **per-element** citation list (simpler, matches the literal
CONTEXT.md wording) because the Admin needs to see *what backs this tier* versus
*what backs this dependency* to review grounding meaningfully.

## The grounding floor is tiered; "unsourced" is derived, not stored

ADR-0004 says "unsourced claims are flagged," which rules out both a silent drop
and a blanket must-cite-everything. The standard:

- **Existence claims are hard-required to be sourced.** No actor enters without a
  real citation on its `relevance` claim; no flow enters without one on its
  `dependency` claim. This is the floor that keeps the accept-gate from being
  theater (ADR-0008): every element the Admin reviews traces to something real.
- **Secondary claims (`tier`, `location`, `substitutability`) may be proposed
  unsourced-but-flagged.** The value is still set; the *absence of a citation
  tagged to that claim* is the flag. "Unsourced" is **derived** in the review
  queue, never a stored boolean — there is one source of truth (the citation
  list).

We rejected **propose-but-flag everywhere** (lets a wholly ungrounded actor reach
the queue) and **hard-require everywhere** (one unsourceable tier kills an
otherwise-grounded actor, and it contradicts ADR-0004).

## The adapter translates; the service persists; the model never touches the DB

The generation adapter sits behind a `GenerationModel` interface and returns
**structured domain proposals** — `{ reply, proposedActors, proposedFlows }` with
citations already parsed — so all Anthropic wire shape (tool-call JSON, citation
blocks, web-search metadata) is translated *inside* the adapter and never leaks
past the interface. The adapter does **no persistence**. The `structure-service`
orchestrates: call the adapter, then persist each proposal through the **same**
`addActor`/`addFlow` repository methods manual authoring already uses, so
generated elements land as `proposed` through one code path and reuse the
accept-gate untouched.

Because a turn commonly proposes new actors *and* a flow between them before
either has a persisted UUID, proposed flows reference their endpoints by the
model-supplied **name/temp-id**; the service persists actors first, builds a
name→UUID map, then resolves flows. Persistence is **best-effort per turn**: every
valid actor is kept; a flow whose endpoint will not resolve is **dropped (not
backfilled with a synthesized, ungrounded actor)** and reported. The per-turn
report ("3 actors, 1 of 2 flows added; dropped: endpoint 'Foxconn' not found") is
surfaced in the conversation panel — never swallowed. The accept-gate is the real
safety net, so we rejected wrapping a turn in a transaction for an
all-or-nothing invariant the domain does not need.

## Conversation is client-held and stateless; the graph is the durable state

The conversation panel holds a plain `{ role, text }[]` transcript and sends it
each turn; the server and adapter are **stateless** and run fresh web search per
turn. Every turn is *also* fed the current working structure, so proposals are
grounded in the actual graph (reuse existing actors by `actorKey`, do not
duplicate). There is **no conversation persistence** in v1: refreshing the
workbench clears the chat but keeps every proposed actor, flow, and citation —
the accept-gate's persisted proposals are the durable record. Server-persisted,
resumable conversations are a clean additive slice if ever needed.

## Verification is asymmetric: deterministic fake, key-gated live smoke test

The real Anthropic adapter cannot be run deterministically in CI (live search,
cost, non-determinism), so the "contract-tested against a fake" requirement is
necessarily asymmetric:

- A `FakeGenerationModel` (in `tests/`, never `src/` — there is no product need
  for an offline generator) returns a canned `GenerationResult`. The
  **deterministic plumbing tests** assert the *service* behavior: persists actors
  as `proposed`, resolves flow endpoints by name→UUID, attaches citations
  per-claim, derives unsourced flags, enforces the grounding floor (drops an
  ungrounded actor), reuses actors by `actorKey`, and produces the best-effort
  report.
- The real adapter gets a **live smoke test gated on `ANTHROPIC_API_KEY`** that
  **skips when the key is absent** — the same skip-without-credential convention
  as the Postgres contract half (skips without `DATABASE_URL`). It asserts the
  looser live properties: ≥1 proposal, every element carries ≥1 citation with a
  non-empty `quotedText`, URLs resolve.

## Route hardening (ADR-0009)

The generation route is admin-guarded (`requireAdmin`). `ANTHROPIC_API_KEY` is
env-only and read **lazily and fail-closed**: the adapter factory throws only when
a generation request constructs it, so the app boots and every non-generation
path works without the key; the route catches a missing-key error and returns a
generic `503 "Generation is not configured"` (no key, no stack). Rate limiting is
**best-effort in-process** for the single-admin v1 boundary: a per-principal token
bucket (sustained-rate cap) plus an in-flight concurrency guard (kills the
double-submit / runaway-loop case, the real budget threat), both keyed off the
admin principal, limits in constants/env. A Postgres-backed hard limiter is the
hardening path if the boundary ever widens. Live-call failures persist
**nothing** (the repository is touched only after a parsed result): API/network
errors return a retryable error envelope; malformed or empty model output is a
**zero-proposal turn**, not an error; an explicit bounded timeout constant
surfaces as a retryable error rather than an opaque platform 504.

## The approved generation prompt

Recorded here per the issue's HITL requirement. The concrete impl lifts this into
a constant; the citable claim names and the substitutability rubric are the same
ones defined above and in CONTEXT.md.

> You help an Admin author a **power-dependency graph** for a single Theme: a
> subject area (e.g. AI compute, energy). The graph's actors are companies,
> countries/regions, data centres, and institutions; its flows are directed
> dependency edges. Your job is to **propose** actors and flows for the Admin to
> review — you never publish, and nothing you propose is trusted until the Admin
> accepts it.
>
> **Ground every proposal in real sources.** Use web search and fetch before you
> assert anything. Do not propose an actor unless you have retrieved a real source
> establishing its **relevance** to this theme, and do not propose a flow unless
> you have retrieved a real source establishing that the **dependency** exists.
> Attach to each proposal one citation per claim it makes: for an actor,
> `relevance` (required), and `tier` and `location` where you assert them; for a
> flow, `dependency` (required) and `substitutability`. Each citation carries the
> source URL, its title, and the **exact retrieved snippet** that backs the claim.
> If you assert a tier, location, or substitutability you could not find a source
> for, still include it but attach no citation for that claim — the Admin will see
> it flagged as unsourced. Never invent a URL.
>
> **Flow direction is dependent → depended-upon.** Before emitting any flow,
> state the dependency in words: "*X depends on Y*" — then emit the flow with
> `from = X` (the dependent) and `to = Y` (the upstream it relies on). "TSMC
> supplies Apple" means *Apple depends on TSMC*, so the flow is `from Apple, to
> TSMC`. Getting this backwards inverts where the graph says power lies.
>
> **Substitutability** is a number in [0, 1] on each flow: **0** = the dependency
> has no real substitute (a hard structural chokepoint, e.g. EUV lithography);
> **1** = freely substitutable commodity. Choose the value by reasoning about how
> replaceable the upstream actor is, and cite the source that supports your
> judgment.
>
> You are given the theme's **current working structure** each turn. Reuse an
> existing actor by its `actorKey` rather than proposing a duplicate, and keep
> proposals within the theme's scope. Work **incrementally**: propose a small,
> related, reviewable batch each turn, not an exhaustive dump. Converse naturally
> — it is fine for a turn to ask a clarifying question or acknowledge a steer and
> propose nothing.
