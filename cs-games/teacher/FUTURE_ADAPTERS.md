# Teacher Tools source adapter extension points

Teacher Tools currently registers sources in `adapters.js`. Each source registers its
exportable modes and a generator bridge; `generateAssessmentItem(sourceId, modeId,
difficulty, seed, points, options)` normalizes the resulting item. Source-specific filters
belong in `makeConfig()` and are passed only to the selected source's bridge.

## Adding Workplace Readiness after its replacement generator ships

Do not build against the current/older Workplace Readiness implementation. Once Claude's
completed ZIP is available, inspect its documented public API, graders, schemas, and
validators first. Then:

1. Add a `workplace-readiness` bridge module under `cs-games/teacher/`; do not copy the
   generator or modify its student-game session/progress code.
2. Register the source and only modes whose grader can prove one defensible answer:
   Workplace Decisions, Best Next Step, Put the Steps in Order, and Find the Problem.
3. Add source-specific Workplace Skills, career-setting, difficulty, and mode controls.
   Pass those settings only to this adapter.
4. Convert all ordering candidates with the new dependency-graph grader. Keep every valid
   topological order out of the distractors. Reject ambiguous professional judgments,
   unsupported legal claims, invalid mathematics, and misleading safety advice.
5. For Find the Problem, preserve the complete workplace document and use the source's
   keyed segment/line identity; do not infer a problem by searching text.
6. Return the common normalized item fields: `sourceId`, `source`, `modeId`, `mode`,
   `difficulty`, `topic`, `passage` or `context`, `prompt`, `choices`, `correctIndex`,
   `correctAnswer`, `explanation`, stable semantic `signature`, and `points`.
7. Add adapter tests that independently call the replacement generator's graders and
   validate the full QTI ZIP before adding the source to the UI.

The shared preview/QTI renderer escapes all generated text and handles multi-paragraph
`passage`, `questionContext`, and `response` content. QTI remains the existing single-answer
QTI 1.2 export. Do not show a source control until its adapter and tests are complete.
