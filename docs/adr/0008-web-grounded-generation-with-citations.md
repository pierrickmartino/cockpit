# Web-search-grounded generation with citations (Claude Opus 4.8)

The generation model is Claude Opus 4.8, run at authoring time with the web
search and web fetch server-tools enabled and the API citations feature on. It
searches and fetches real pages before asserting, and each proposed claim
carries a citation tied to retrieved source content. The Admin reviews those
real sources to accept a proposal (ADR-0004).

A bare model asked to "cite sources" emits plausible, well-formed, non-existent
URLs — which would make the accept-gate theater. Grounding the model in actual
retrieval is what makes the gate real. We rejected a curated RAG corpus for v1
(it can't discover sources you didn't pre-load, and building/maintaining the
corpus is heavy) but the citations captured here are exactly the data that will
tell us which sources to curate later, so RAG remains a v2 hardening path. A
consequence: the authoring environment needs outbound web access for generation
to work.
