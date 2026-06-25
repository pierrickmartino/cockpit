# Unified TypeScript / Next.js stack

The whole application is one TypeScript codebase on Next.js (Vercel): UI, API
routes, in-app graph computation (graphology, per ADR-0006), and generation
orchestration (`@anthropic-ai/sdk` with web-search/fetch tools, per ADR-0008),
with PostgreSQL behind a TypeScript query layer. No separate backend service.

The graphs are small and shallow, so centrality computes in-process inside an API
route — no second service, network hop, or deploy target. One language lets the
Actor / Flow / Indicator / Tier types be shared across the authoring UI, the API,
and the published `jsonb` read model, which is most of the surface area. We
rejected a split Next.js + Python backend: its only justification is heavy
numerical/ingestion work, and ingestion is explicitly deferred (ADR-0003), so
that pressure isn't real yet. Python ignores left over from the template were
removed from `.gitignore`.
