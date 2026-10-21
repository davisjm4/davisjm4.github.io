# Assessment source adapter extension points

Teacher Tools registers assessment sources in `adapters.js`. A source declares its
exportable modes and a generator bridge. The bridge returns the normalized item fields
consumed by the shared preview and QTI 1.2 renderer: source/mode metadata, difficulty,
context or passage, prompt, optional Java code, choices, one correct index, explanation,
signature, and points.

## Workplace Readiness Games

`workplace-adapter.js` is the thin bridge to the published game runtime under
`/wpr-games/workplace-readiness/`. It builds an isolated hybrid library from the existing
authored and compositional bundles, uses `WRG.selector.createSession`, and validates every
displayed choice through `WRG.grader.grade`. It does not initialize the game UI or read or
write local student progress.

The four modes use ordinary single-answer QTI items:

- Workplace Decisions and Best Next Step keep the source's four options and best-answer key.
- Put the Steps in Order shows the complete numbered step list and offers one valid order plus
  three permutations rejected by the dependency grader. All valid topological orders are
  excluded from distractors.
- Find the Problem shows the complete workplace document and offers four line labels, with
  the keyed segment taken directly from the source answer model.

Skills and career settings come from the Workplace Readiness content bundle. Difficulty,
mode, skill, and context filters are passed only to this adapter. Items with incomplete,
ambiguous, duplicate, or ungradeable options are rejected.

## Adding another source

1. Inspect the source engine's actual public API and pure grader before registering it.
2. Add a narrow bridge module. Reuse source content and validators; do not copy its generator
   or attach to student-session or progress state.
3. Add explicit source-specific controls and pass only those values to that adapter.
4. Normalize the output and create stable exact and semantic/configuration signatures. Do not
   treat answer-option shuffling as new content.
5. Grade every candidate response with the source's answer model. For ordering questions,
   reject every valid alternative order from distractors.
6. Add seeded coverage, filter, uniqueness, adapter regeneration, and complete QTI package
   tests before exposing the source in the selection control.

The shared renderer safely escapes generated text and supports multi-paragraph `passage`,
`context`, `questionContext`, and `response` fields while retaining the existing preformatted
Java code path. Keep exports on the established single-answer QTI 1.2 structure unless a
separate question type is deliberately implemented and validated.
