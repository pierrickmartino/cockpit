# Cockpit

Living maps of power over geopolitical/economic themes. An **Admin** authors a
**Theme** in a workbench; a **Viewer** consumes the published result. See
[`CONTEXT.md`](./CONTEXT.md) for the domain language and [`docs/adr/`](./docs/adr)
for the architecture decisions.

This repository currently contains the **walking skeleton** (issue #3): the
thinnest end-to-end path — schema, repository, API, admin/viewer shells, and one
E2E test — that every later slice extends.

## Stack

- **Next.js (App Router) + TypeScript** — one codebase for UI, API routes, and
  domain logic (ADR-0010).
- **PostgreSQL via Drizzle ORM** — authoring tables; published `jsonb` read model
  comes later (ADR-0006/0012).
- **Vitest** — unit, integration, and repository contract tests.
- **Playwright** — E2E critical flows.
- **Zod** — boundary input validation.

## Architecture (skeleton)

```
src/
  domain/theme.ts              Theme type + state
  api/response.ts              ApiResponse envelope (success/data/error)
  repositories/
    theme-repository.ts        ThemeRepository interface (repository pattern)
    in-memory-theme-repository.ts   fake (dev/test double)
    postgres-theme-repository.ts    Drizzle-backed implementation
    factory.ts                 wires the production repository
  services/theme-service.ts    validation + envelope + not-found mapping
  db/{schema,client}.ts        Drizzle schema + lazy client
  app/
    admin/page.tsx             Admin workbench shell (create a theme)
    view/[id]/page.tsx         Viewer shell (display a theme)
    api/themes/route.ts        POST /api/themes
    api/themes/[id]/route.ts   GET  /api/themes/[id]
```

The fake and Postgres repositories are verified by **one shared contract suite**
(`tests/contract/theme-repository.contract.ts`), so they cannot drift apart.

## Getting started

```bash
pnpm install
cp .env.example .env            # set DATABASE_URL
pnpm db:migrate                 # apply migrations
pnpm dev                        # http://localhost:3000
```

## Testing

```bash
pnpm test        # unit + integration + contract (Postgres half runs when DATABASE_URL is set)
pnpm test:e2e    # Playwright: create a theme in admin, then view it
pnpm lint
pnpm typecheck
```

The Postgres half of the repository contract suite **skips** (does not fail) when
`DATABASE_URL` is unset, so the fake half always runs. CI runs everything against
a Postgres service container.
