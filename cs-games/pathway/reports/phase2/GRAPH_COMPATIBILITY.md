# Graph compatibility (Phase 2)

## Summary

The curriculum graph changed additively and its version was deliberately not changed. It still reads `2026.11.10.1`. Every node id, every question-family id and the order of nodes from the Phase 1 graph are preserved, nine nodes and 95 question families were added, and nine existing nodes gained bindings. No node was removed, renamed, re-parented or re-timed, and no mastery policy was attached to anything.

| Measure | Base `422398d` | Phase 1 `fc70e68` | Phase 2 |
| --- | --- | --- | --- |
| Version | 2026.11.10.1 | 2026.11.10.1 | 2026.11.10.1 |
| Nodes | 280 | 281 | 290 |
| Question families | 296 | 358 | 453 |
| Areas | 69 | 69 | 69 |

## What changed in the graph

Nine nodes are new: `linkedlist-lab:references`, `inheritance-polymorphism-lab:hierarchy`, `:override`, `:tracer` and `:debug`, `documentation-lab:editor` and `:builder`, and `robot-algorithms:build` and `:debug`. Each has an instructional objective, an estimate of 80 or 160 minutes marked `estimateProvisional`, no prerequisites, and a `coverageLimit` note that states what its evidence covers. They belong to existing areas, so no area was added. Ninety-five families are new and no existing family changed.

Nine existing nodes changed. `method-constructor-lab:match-call` gained `order-args` in its selector (and an `evidenceScope` note). Eight others gained family bindings for generator families that existed but were not bound: Inheritance `abstract`, Documentation `inspector`, `docs` and `detective`, and Robot Algorithms `predict`, `loops`, `conditionals` and `methods`. Binding a family narrows which nodes a question can credit once it names a family, so these bindings tighten attribution; they do not widen it. A test (`graph is additive to Phase 1`) pins the Phase 1 node order and ids and the Phase 1 selectors from `fixtures/phase1-ids.json` and fails if any selector other than `match-call` changes.

Everything else in the graph file (schema version, source versions, courses, areas, standards sources, coverage limits) is byte-identical to Phase 1.

## Why the version was not bumped

`cs-games/pathway/model.mjs` rejects a class pathway whose `graphVersion` differs from the current graph version unless the pathway carries a matching `curriculumSnapshot`. Bumping the version without migrating published snapshots would make existing pathways fail validation. Because every change here is additive, existing pathways remain valid as they are, so the version stays. If a later change removes or renames a node or family, or changes what an existing id means, the version should be bumped together with a snapshot migration, and `fixtures/phase1-ids.json` should be refreshed deliberately at that point.

## Snapshot and published pathway implications

A published pathway revision pins copies of the node descriptors for the nodes in its sequence, taken from the graph at publish time (`wpr-games/workplace-readiness/service/pathways.mjs`). The nine new nodes are in no existing sequence, so no published class changes and nothing new appears in a class unprompted. A teacher editing a draft sees the current graph's nodes merged with the pinned ones, so the new nodes can be added deliberately, and publishing then pins them. The one existing node whose behavior changes is `match-call`: answers to Order Arguments now credit it in addition to Match Calls. Evidence is matched to nodes by id at ingest, so a class that already tracks `match-call` sees slightly more practice evidence on that node even though its pinned descriptor still carries the older selector. This changes no status, because no mastery policy is active and evaluation of practice evidence remains provisional.

Evidence is attributed when an event arrives. The service wrote each practice event's node dimensions at ingest time and aggregates by those stored dimensions, so answers that students submitted before this release to the eleven formerly unmapped modes keep their empty dimensions. The stored events also keep their assessed mode, family and difficulty, so a later backfill could attribute them, but that is a data operation outside this package; none was run and none is proposed here without teacher approval. New answers from the updated pages credit the new nodes from the day the pages and graph are deployed.

## Student evidence and compatibility with cached pages

No student evidence was deleted, rewritten or re-attributed. A browser that still has an older cached copy of a lab page sends its begin call without the new annotation; the server then falls back to the page's mode, which credits the right node without family narrowing. The compatibility test confirms this for all eleven modes. Each changed page also carries a bumped cache tag on its script and imports so the new annotation is fetched fresh, and a test fails if a tag is missing.

## No calibration is implied

Time estimates on the new nodes are provisional and follow the generator's existing rule from each node's complexity. No question-count threshold, mastery policy, certification or interactive map was implemented. Nothing in this package states how much evidence earns mastery of a node.

## Deterministic regeneration

`cs-games/pathway/curriculum-graph.json` is generated by `node cs-games/pathway/build-graph.mjs`, and the existing CI step regenerates it and fails on any diff. The nine nodes are defined in the generator, following the precedent of the Phase 1 `assemble` node, because the Package F inventory the generator reads records only the modes Teacher Tools can export as multiple choice. After any merge, regenerate the graph rather than merging the JSON by hand. The evidence gap registry (`evidence-gap-registry.json`) and the coverage matrix are regenerated with `node cs-games/pathway/tests/build-gap-registry.mjs`, and `--check` fails if either is stale; the registry records the graph version it was built against.
