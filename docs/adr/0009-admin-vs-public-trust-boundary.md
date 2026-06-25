# Single Admin-vs-public trust boundary (v1)

v1 has exactly one trust boundary: an authenticated Admin versus everyone else.
Authoring, generation, accept, and publish actions sit behind an Admin check;
published snapshots are served openly. There are no Viewer accounts — filters
are client-side view state, themes are global, and there is no per-viewer data to
protect.

The only surface that genuinely must be locked down is authoring/generation: it
spends model budget, makes outbound web calls, and changes what the public sees.
Concentrating auth, rate limiting, and input validation on that one boundary
matches where the risk actually is, rather than building a user system the
product doesn't yet need. Viewer accounts (saved views, alerts) are a clean
additive step later; multi-tenancy would be a product pivot, not a v1 concern. We
rejected both for v1.
