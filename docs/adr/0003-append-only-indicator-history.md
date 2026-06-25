# Indicator values are stored as append-only history from day one

Every ingested indicator value is written as a timestamped, append-only record;
nothing is overwritten. The graph structure (actors, flows) stays versioned at
the coarser snapshot/publish grain — only indicators carry fine-grained history.
v1 renders only the latest value (optionally a sparkline); the trend and
time-travel UI is deferred.

History is cheap to record (a row per value) and impossible to backfill if
skipped — going history→latest is trivial, latest→history is a data loss you
can't undo. We pay the small storage cost now to keep trends, "development over
time," and time-travel reachable later without a migration. The risk is that a
future reader sees an unused history table and removes it; this ADR exists to
stop that.
