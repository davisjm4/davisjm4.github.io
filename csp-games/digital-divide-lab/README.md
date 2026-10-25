# Digital Divide Scenario Lab · G-116

Static AP CSP practice at /csp-games/digital-divide-lab/. One scenario, four choices, one scored selection, then an explanation. Five freely selectable modes and five topics; Mixed defaults.

- content.js: 64 authored text frames, each with five distinct operational clues, scoped question, key, three plausible alternatives and rationale.
- data.js: 16 evidence families × five fictional datasets. Several comparisons reverse direction across variants. Every instance labels its data fictional.
- model.js: stable modes, topics, 12 barriers, 20 contexts and 12 intervention categories.
- engine.js: one finite 400-instance representation, validation, seeded bounded selection, shared recent history, shuffled choices and feedback. No rendering-based correctness.
- data-view.js: neutral tables/charts with header scopes, captions, equivalent text and no answer annotation.
- app.js and metrics.js: existing shared daily/active-time session lifecycle and cumulative disjoint actual-mode, barrier, topic and filter metrics. No separate score store.
- tests.mjs, review-fixtures.js and ui-tests.mjs: independent numerical comparisons, scoped author-review fixtures, simulations and DOM/session/Summary checks.

Run npm run test:divide --prefix csp-games from repository root. Full regression: npm test --prefix csp-games. Catalog: node cs-games/catalog-tests.mjs using the repository’s existing dependency setup. browser-harness.html tests CSS widths, not physical hardware.

The corpus is finite: 80 instructional frames /400 compositions. Narrow mode/topic combinations contain 3–4 families and 15–20 instances; the UI states this limitation. No backend, accounts, required typing, student names, runtime APIs or external runtime assets. Linked reference sources need a connection; practice after loading does not.
