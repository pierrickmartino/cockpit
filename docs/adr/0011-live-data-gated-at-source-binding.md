# Live data is gated at the source binding, not per item (amends ADR-0004)

ADR-0004's per-item accept-gate applies to authored structural claims. Live
ingested data cannot work that way — prices tick continuously and news lands many
items per actor per day, so an Admin cannot accept each value or headline.
Instead, the Admin accepts a **source binding** once (this actor's price = ticker
`TSM` from provider X; this actor's Feed = query Y on news source Z), and values
and items flowing through an accepted binding are auto-trusted.

Live data is shown as **attributed**, not asserted: "per Reuters, 14:32",
visually distinct from Admin-accepted structural claims like "TSMC supplies
Nvidia". The distinction is load-bearing — a news item can be wrong or junk even
from a legitimate source, and it must never look like Cockpit's own verified
claim. We rejected per-item review (incompatible with live) and no-gate ingestion
(a bad ticker mapping or hallucinated headline would reach Viewers unreviewed).
The gate still exists; it moved from the item to the source.
