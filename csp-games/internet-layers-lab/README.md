# Internet Layers & Protocol Roles Lab

Static, local-first AP CSP practice: one situation, four choices, one scored decision, and specific feedback. Mixed is the default; five modes and five topic filters use the same interaction. No accounts, external dependencies, runtime services, or uploads.

## Repository audit and reuse

Packet Router already teaches constructing routes and rerouting around failures. Network Breaker teaches connectivity and link removal. Shared Mixed AP Practice covers some protocol comparisons. Those games are preserved. This lab adds contextual role identification, explicitly qualified missing dependencies, state-dependent next actions, misconception diagnosis, and reading supplied diagrams. It reuses the established dark theme, daily session tracker, active-time accounting, session navigation and cumulative summary. It does not replace existing graph gameplay.

## Architecture

- `content.js`: 80 authored instructional tasks, 16 per mode, each with five contextual/topological variants (400 distinct instances). Each family documents its conceptual focus.
- `model.js`: four-role reference, five contexts, graph representation, path utilities and readable descriptions.
- `engine.js`: validation, seeded finite selection, eligibility filters, answer shuffle and feedback. All 36 mode/topic combinations are nonempty. Metadata identifies mode, topic, concept, family, question and AP learning objective.
- `diagram.js`: lightweight accessible SVG graphs, role boxes and arrival-order strips. Text supplies all shown data. No animation or graphics library. Neutral labels before selection; explicit annotations afterward.
- `app.js`: controls, deferred scored records, terminal answer lock, local recent history and breakdowns. Help, skips and filters are not submissions.
- Shared `session-groups.js` and `summary.js`: aggregate tagged cumulative topic/concept metrics without counting results twice or depending on the 256-record detail buffer.

Recent history spans modes, topics and reloads within the daily session: last 50 exact instances, last three families and, when feasible, last two concepts. Selection first excludes exact instances, then relaxes family/concept cooldown only if necessary. If the eligible exact pool is exhausted, the oldest relevant instance is released. No retry loop or silent filter broadening. Small combinations disclose their pool size. This is a finite curated corpus, not unlimited content.

## Validation

Run `npm run test:internet --prefix csp-games`, `npm test --prefix csp-games`, and `node cs-games/catalog-tests.mjs` from the repository root. The committed generator report records executed results. Independent adjacency-matrix traversal verifies usable answer paths, first hops, bridge failures and added alternatives; table/address lookups and known layer roles are checked independently of generator helpers. Semantic review remains necessary: schema checks cannot prove every explanation or distractor unambiguous.

See [protocol/source review](reports/PROTOCOL_REVIEW.md), [generator metrics](reports/generator-metrics.json), and [release validation](reports/VALIDATION.md). Classroom review, physical Chromebook testing and real assistive-technology testing remain pending.
