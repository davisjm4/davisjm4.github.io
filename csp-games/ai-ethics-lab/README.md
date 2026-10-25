# AI Ethics Scenario Lab · G-115

Static AP CSP practice at /csp-games/ai-ethics-lab/. One fictional situation, four choices, one scored selection, then an explanation. Mixed defaults; all five modes and five topics are freely available.

- cases.js: 100 authored instructional frames, including the key, three distractors, an alternate distractor, bounded prompt, rationale and contrast.
- model.js: stable mode/topic/domain/concept metadata and reviewed operational details.
- engine.js: five internally scoped compositions per frame, finite seeded selection, shared recent history, choice shuffling and feedback. The evidence-mode variants add review conditions without supplying the missing evidence.
- app.js: one-decision interface and the existing shared daily session tracker. No duplicate score store, accounts, student-data input, backend or runtime network requests.
- metrics.js: disjoint cumulative buckets for actual mode, topic, concept and selected filters, independent of the 256-record retention limit.
- tests.mjs, ui-tests.mjs, review-fixtures.js: generator, reviewed distinction fixtures, DOM, session lifecycle and summary checks.

Run npm run test:ethics --prefix csp-games from the repository root. Full regression: npm test --prefix csp-games. Catalog test: node cs-games/catalog-tests.mjs using the existing java-games dependency setup. browser-harness.html is a CSS-width check, not hardware emulation.

The finite corpus has 100 original situations and 500 composed instances, not 500 independently authored stories. Narrow mode/topic combinations have four families and 20 examples; the interface explains this limit. External educator/classroom review remains pending.
