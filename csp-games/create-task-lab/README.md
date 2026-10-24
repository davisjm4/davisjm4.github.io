# Create Performance Task Lab

Original AP CSP recognition practice at `/csp-games/create-task-lab/`.

- Mixed (default), What's Missing?, and Identify the Component; no difficulty levels.
- One scored attempt. Direct source buttons and line-range brackets select exact annotated regions without text dragging.
- Seven topic filters, shared CSP session storage, daily reset, first-try mode/topic totals, active time, and screenshot-friendly summary.
- 131 authored reasoning families after removing 9 overlapping drafts: 63 diagnosis and 68 identification. A valid baseline is used every sixth diagnosis round (16.7%).

## Architecture

`model.js` defines an annotated syntax tree, source-span renderer, and bounded interpreter. `scenarios.js` supplies 20 original beginner scenarios with separately authored expected-output functions. `catalog.js` associates reasoning patterns with exact targets or a single controlled subtree mutation. `engine.js` builds reproducible challenges, validates baselines and mutations, and balances a recent-history sampler. `app.js` renders source controls and uses the existing `../session.js` API.

The source model carries procedure definitions, parameters, calls, arguments, assignments, return statements, list storage/use/access, input, output, Boolean expressions, selection, iteration, and events. It is the source of truth for both displayed code and source regions. No keyword-only answer detection or arbitrary source execution is used.

## Reproduce

From repository root:

```sh
npm ci --ignore-scripts --prefix csp-games
node csp-games/create-task-lab/tests.mjs
node csp-games/create-task-lab/ui-tests.mjs
npm test --prefix csp-games
TZ=America/Los_Angeles node csp-games/daily-session-tests.mjs
```

A challenge link records `familyId`, `variant`, `seed`, `phrasing`, and `valid`. `buildChallenge()` and `createSampler()` are deterministic. Exact challenges cannot repeat within the previous 50 sampled rounds, including filter changes. Narrow filters may repeat a reasoning family using different programs; this is not a promise of 50 different families per topic.

## Review evidence

- `reports/validation.json`: measured counts, structural diversity, sampling and test results.
- `reports/review-corpus.json`: 389 distinct, reproducible examples with correct source spans/choices, mutations, explanations and behavioral results.
- `reports/REVIEW_SAMPLES.md`: readable examples from all 131 families and both modes.
- `reports/IMPLEMENTATION_REPORT.md`: instructional decisions, sources, verification and limitations.

The interpreter executes this bounded program model, not arbitrary external pseudocode. REPEAT UNTIL tests its condition before the body; lists are 1-indexed. Event examples explicitly define `WHEN StartPressed` as illustrative event notation, not an AP reference-sheet instruction. MOVE_FORWARD is AP robot notation. Original snippets practice individual components and are not complete scored submissions. There is no external educator certification of the corpus.
