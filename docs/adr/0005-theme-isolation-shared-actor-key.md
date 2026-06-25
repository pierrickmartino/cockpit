# Themes are isolated graphs joined only by a shared actor key

Each theme is a self-contained graph that is authored, snapshotted, and published
atomically. The same real-world entity (Microsoft, TSMC, Taiwan) is authored
independently in each theme it appears in. The only thread between themes is a
stable `actorKey` stamped on every actor — a slug or external id (ticker, ISO
country code).

Isolation keeps the snapshot/publish model atomic and the authoring loop simple,
which matters more in v1 than cross-theme queries; a shared actor registry would
muddy what publishing freezes if a referenced actor were edited elsewhere
afterward. But recording a shared identity key costs nothing now and is the hook
that makes a future shared registry or "everything about Microsoft, everywhere"
view possible without a painful re-identification migration. We rejected a shared
registry for v1 and accepted per-theme duplication as the price of atomic
publishing.
