# Ingestion runs on Vercel Cron with a next_due due-bindings pattern

A unified Next.js app on Vercel (ADR-0010) has no always-on process to poll
providers. Ingestion runs as a scheduled Vercel Cron route firing on a fixed tick
(~5–10 min). Each run selects source bindings whose `next_due` has passed,
fetches those, writes the live overlay, and stamps the next due time. A per-run
batch cap keeps each invocation under the function timeout.

The `next_due` column decouples each binding's logical cadence (10/30/60 min)
from the physical cron tick, so one cron job serves many cadences; the tick is
the floor on achievable ingestion cadence. This adds zero infrastructure and
stays inside the unified stack. When fan-out grows enough that a single run can't
drain the due queue in time, scheduling graduates to a managed scheduler/queue
(Inngest, QStash, Trigger.dev) — the `next_due` model ports directly. We rejected
a dedicated long-running worker (reintroduces the always-on backend ADR-0010
avoided) and a managed scheduler up front (third-party dependency not yet
justified).

Provider API keys (market data, news) are server-side env-var secrets used only
by the ingestion route, never shipped to Viewers (ADR-0009).
