# Release validation — 2026-10-25

## Executed automated checks

- `npm test --prefix csp-games`: complete shared/game regression suite passed, including all existing dance, data, numerical, vocabulary, routing and session tests.
- New Internet engine/content/generator: 48,089 assertions passed. New DOM interactions: 2,120 assertions passed, 444 scored rounds across all 36 mode/topic selections. Total: 50,209 new assertions.
- Los Angeles timezone DOM run passed; daily reset and first-try scoring verified.
- `node cs-games/catalog-tests.mjs` passed, including actual consolidated CSP rendering and all new catalog filters. `git diff --check` passed.
- Independent adjacency-matrix path oracle, table/address lookup and protocol/layer expectations supplement content/schema contracts. Diagram ambiguity found during development was corrected before release.

## Generator evidence

80 families, 400 distinct instances, 16 concepts, all five modes and five topics. 39,000 seeded core/cross-filter rounds reached every family and instance, with zero avoidable exact50/family3/concept2 violations. An additional 10,000 Mixed balance rounds produced mode counts 1,999–2,001. Total measured generator sessions: 49,000 rounds, plus deterministic/reload and deliberately tiny-pool tests. Core/cross-filter mode counts: 7,799/7,801/7,801/7,800/7,799. Answer positions: 9,800/9,531/9,830/9,839. Longest-choice heuristic: 120/400 (30.0%, including ties); shortest: 178/400 (44.5%, including ties). These are descriptive metrics, not proof of instructional validity.

The combined 39,000-round run needed no repeat fallback because filters changed and eligible unseen examples remained. A separate one-family/five-instance run verifies finite oldest-first relaxation after exhaustion. Narrow fixed mode/topic pools contain 10–25 examples and explicitly disclose their size; the selected filter is preserved. No unlimited-generation claim.

## Browser checks

Local Chrome: keyboard answer activation, focus transfer to status feedback and a solid visible outline verified. Responsive frame widths 320, 390, 768, 1024 and 1280 showed no horizontal document overflow. Answer controls remained at least 123 px wide and 64 px high in the measured sample. Missing-step and failed-link graph cases were answered; neutral diagrams expose equivalent network data as accessible text. The local preview reloads when test reports are written; live release verification is recorded separately in tracker G-113.

## Limits and review

Not tested on physical Chromebook, phone or tablet hardware, or with a real screen reader. Accessibility contracts, keyboard interaction and responsive layout were checked; these do not establish assistive-technology certification. Independent teacher/classroom review remains pending. Some variants share a conceptual stem and alter context, node labels, topology state, table entries or observed order. This finite reviewed corpus can be expanded without changing gameplay. The readiness pathway itself is deferred.

## Published browser verification

Initial published commit `4519e22` passed Pages and all ten triggered verification workflows. Six desktop rounds covered Mixed plus all five named modes; one intentional error produced 5/6 = 83.3% in the live Summary, with mode, topic and concept rows. A live 390 px forwarding-table answer raised results to 6/7. Live responsive widths 320/390/768/1024 showed no horizontal overflow and answer controls at least64 px high. Both launch catalogs opened the game. Final content revision replaces unrelated password/cable distractors with related role confusions and uses versioned v2 assets. Final revision/deployment/verification references are recorded in tracker G-113.
