# Array Lab implementation and validation report

The compositional engine is implemented and its automated checks pass. Production publication and actual browser verification are pending in this commit. Independent human instructional sign-off remains outstanding; the 720-sample review is explicitly assistant review.

## Implementation

All twelve practice modes now use difficulty-aware compositional generation in student practice and teacher exports. Each challenge carries its reasoning model, structural variant, reproducible seed and structured difficulty evidence. Beginner foundations have dedicated recipes; Intermediate requires dependent reasoning; Advanced requires interacting states or algorithm stages. Full classification rules and examples are in [the engine documentation](../compose/README.md).

Selection-only updates and swaps keep array contents stable until submission. The final state and indices appear after answering. Ordinary choices have no A/B/C/D prefix. Keyboard selection/submission, responsive grids, teacher links, QTI, saved preferences and the existing shared daily/per-mode scoring remain supported. Mixed Practice respects the selected difficulty and attributes each result to its underlying mode.

The persisted semantic cooldown spans all modes, Mixed, difficulty changes, reloads and days. Shared/equivalent structures have one key. Values, names, array lengths, model/difficulty labels and branch outcomes cannot manufacture a new key. Generation does not silently repeat or lower difficulty when a pool is exhausted.

## Mode/difficulty coverage

Each cell is distinct instructional model sets / unique certified structures. Every registered model has at least six eligible structures; every cell has at least ten distinct model sets and sixty unique structures. Counts are unions, not double-counted model ownerships. Beginner first-match and missing-target share one scan structure set; twelve registered Search models represent eleven distinct sets at that level. The detailed per-model counts are in [difficulty-gate-results.json](difficulty-gate-results.json).

| Practice mode | Beginner models / variants | Intermediate models / variants | Advanced models / variants | Difficulty audit |
|---|---:|---:|---:|---|
| Select an Array Element | 10 / 81 | 10 / 222 | 10 / 222 | Assistant pass; human pending |
| Predict an Array Update | 10 / 60 | 10 / 216 | 10 / 234 | Assistant pass; human pending |
| Perform an Array Update | 10 / 90 | 10 / 222 | 10 / 222 | Assistant pass; human pending |
| Trace an Array Search | 11 / 66 | 12 / 720 | 12 / 589 | Assistant pass; human pending |
| Trace an Array Traversal | 11 / 62 | 11 / 474 | 11 / 414 | Assistant pass; human pending |
| Access a 2D Array | 10 / 90 | 10 / 247 | 10 / 253 | Assistant pass; human pending |
| Update a 2D Array | 11 / 100 | 11 / 193 | 11 / 205 | Assistant pass; human pending |
| Nested Loops and 2D Traversal | 10 / 60 | 10 / 282 | 10 / 268 | Assistant pass; human pending |
| Choose the Java Statement | 10 / 60 | 10 / 67 | 10 / 74 | Assistant pass; human pending |
| Create Arrays & Trace References | 11 / 85 | 11 / 247 | 11 / 280 | Assistant pass; human pending |
| In-Place Array Algorithms | 11 / 308 | 11 / 76 | 11 / 131 | Assistant pass; human pending |
| Trace 2D Array Algorithms | 10 / 60 | 10 / 306 | 10 / 266 | Assistant pass; human pending |

All twelve modes were modified through the shared engine/UI. No other game's generator or scoring utility was replaced. Teacher adapter changes are limited to Array Lab's newly supported modes/difficulties and cache versions. Recent main was checked before integration; unrelated generators remain intact.

## Instructional validation

The initial documented twenty-sample assistant review rejected eighteen Beginner difficulty assignments and two algebraic/shortcut defects. All twenty were replaced through model redesign. Later source/sample inspection repaired constant reference-equality answers, cancelling carry logic, output wrappers masking an irrelevant algorithm, decisive first-comparison shortcuts, unused Advanced writes, untouched Beginner observations, unhelpful replacement-array options, ragged-row preservation and excessive 2D evaluation workload. A question-count estimate for all initial model-wide defects is not asserted.

The final [720-sample review](instructional-review.html) contains twenty samples per mode and difficulty. Every record includes code, choices, answer, seed, concept, minimum path and an explicit hash-bound assistant assessment. All 720 were inspected through generator source and per-sample goals, answers and concrete dependency paths, including repaired replacement samples. Zero unresolved classifications were identified in those samples. This is **assistant source/dataflow review, not an independent human audit**. It does not establish empirical classroom difficulty or prove the absence of every possible shortcut. The user's separate human-review acceptance requirement remains pending. Complete machine-readable evidence is in [instructional-review-720.json.gz](instructional-review-720.json.gz).

The historical twenty-sample rejection record, development gallery and diagnostic JVM report are retained as historical evidence. They are not the current acceptance results.

## Automated results

* 390,000 stress challenges passed: 10,000 in each of 36 mode/difficulty cells, 20,000 Mixed and 10,000 switching/reload cases. Zero rolling-50 violations. All registered models were exercised. Mixed covered all 36 cells.
* 8,491 Java programs compiled and their outputs matched the independent JVM. 8,459 complete array/reference states matched. Thirty-two intentional runtime exceptions and two intentional uninitialized-local compile failures were verified. All 720 instructional samples were included. Zero mismatches.
* Difficulty adversarial tests passed, including 4,534 cross-seed structure pairs, the rubric's alias/reassignment examples, irrelevant-code and array-length invariance, neutral/cancelling arithmetic, short-circuit evaluation, row identity, error dependencies, Boolean-result shortcuts and reproducibility.
* DOM interaction/session tests passed for all twelve modes × three levels, target-only updates/swaps, submission locks, selected-mode/Mixed statistics, teacher parameters, 1–4/Enter/arrows, prefix-free choices and unavailable storage. Controlled local-midnight tests pass in UTC and America/Los_Angeles: same-day reload persists; overnight submissions expire; focus detects expiration; preferences and independent repetition history survive.
* Existing Array Lab fixtures passed: 3,480 redesign samples / 17,486 assertions / 52 compiled snippets, plus 9,000 advanced legacy samples and their JVM fixtures. Explicit legacy APIs remain for these fixtures; student practice uses the compositional engine.
* Shared session tests and QTI formatting/integrity checks passed. Teacher adapter regression passed 852 validated samples across 136 source/mode/difficulty combinations and a fifty-item unique export.
* The broad repository suite previously passed its affected Array, Boolean, Range Explorer, session and teacher checks, then stopped at an unchanged RACECES adapter assertion: 23 authored topics versus the fixture's expected 15. The final broad rerun reached this same unchanged RACECES failure after all affected checks passed. Remaining unrelated recursion/JVM, ArrayList, String and Search/Sort suites passed separately during this work. The unrelated RACECES fixture was not weakened.

Current runtime SHA-256: `fe5c7085c1a7dc315be091ea125ac17334d300791aa629177148bb489f03839b`. Smoke, stress, coverage, JVM and completed review records all carry this same digest. Detailed counts and distributions are in the JSON reports beside this document.

## Browser/publication status

The cloud browser opened the existing production game to establish its current baseline. It cannot reach the workspace's local development server; actual updated desktop/mobile workflows will be verified after publication. The responsive verification page provides 390, 768 and 1120 px game frames for browser checks. Controlled-clock day transitions are automated DOM tests, not an actual overnight browser wait.

Draft integration PR: https://github.com/davisjm4/davisjm4.github.io/pull/12 . No production success is claimed in this pre-publication report. Commit/deployment and actual browser results will be recorded after the update is live.

## Remaining limitations

Independent human instructional review is still required for literal completion of that acceptance item. Classification is deterministic and aggressively checked, but not a general formal Java dataflow prover. Large deterministic samples and JVM agreement do not prove every possible generated program. The unrelated RACECES adapter fixture mismatch remains outside this assignment. No student records are transmitted or committed.
