# One Theme per destination; Presentation is bound to the Theme, not chosen

"Theme" means the content/subject area (AI, energy). Visual styling is a
**Presentation** the Admin binds to a Theme — palette, tier→color mapping,
default layers, map framing — frozen into the published snapshot. There is no
separate "design theme" a Viewer selects: choosing a Theme is choosing content,
and its Presentation rides along. This resolves the original brief's "choose a
theme → colors/organization update."

Each published Theme is its own Viewer destination (own URL / embed). A Viewer
lands on one Theme and does not switch — no gallery, no in-app Theme switcher, no
Viewer-facing Theme browsing. The Admin owns both the content Theme and its bound
Presentation and decides what each audience gets via the link they share.

This is the faithful reading of "no gallery, the Admin links it all," keeps the
Viewer experience focused on one sector, and matches deep-link/embed
distribution. We rejected a Viewer-facing gallery and an in-app cross-Theme
switcher for v1; a switcher is a clean additive step later if Viewers turn out to
want to roam. It also honors Theme isolation (ADR-0005): Presentation lives
per-Theme with no cross-Theme coupling.
