# Feed ingestion: dedicated provider, raw items, bounded retention

Feeds are populated by a **dedicated news provider** (structured, queryable,
cheap-per-call), behind a swappable provider interface — **not** the
web-search-grounded generation model (ADR-0008), which is expensive and
authoring-time only (ADR-0001). A Feed source binding carries a per-actor query;
ingestion writes items (title, summary, url, source, timestamp) to the live
overlay, deduped by URL.

v1 stores items **raw** with **no LLM sentiment**: per-item LLM scoring on a live
feed is recurring cost and a derived claim that would need its own attribution
and could be wrong — reintroducing the trust problem ADR-0011 contains. If the
provider supplies sentiment it is stored **attributed to the provider**, never as
Cockpit's own. LLM sentiment is a deliberate v1.1 addition if it proves valuable.

**Retention asymmetry (the non-obvious part):** Indicators are append-only forever
for trends (ADR-0003), but a Feed is recent-events and is **retention-bounded** —
pruned on ingest to a recency window (default 30 days, set via an environment
variable) plus optional per-actor item cap. Unbounded news grows without limit
and stale headlines don't belong on a live dashboard. A future reader should not
"fix" the Feed to match Indicators' keep-forever rule; the asymmetry is
deliberate.
