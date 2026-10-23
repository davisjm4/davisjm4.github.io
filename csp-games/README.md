# CSP Games

Student practice at https://davisjm4.github.io/csp-games/.

Buildless HTML, CSS, and native JavaScript modules. Each game folder has an index.html, so Canvas links work without a single-page-app router. Runtime dependencies: none. There is no backend, login, telemetry, or upload of student information. All games share versioned localStorage session results. Optional name/class period remain in the current browser. Session Summary reports first-try accuracy, retries, submissions, incorrect answers, reveals, skips, and game/topic breakdowns.

## Games

- Code Concepts: rapid one-concept practice across procedures, selection, iteration, variables/expressions, lists, abstraction, algorithms/errors, and computing concepts across all five Big Ideas. Forward code/evidence selection and reverse terminology banks exclude overlapping correct labels. Mixed Practice opens automatically. Incorrect responses receive three levels of spoiler-free conceptual hints. Show Answer permanently closes scoring for that challenge. First-try accuracy, independent retry successes, and reveals are tracked separately; revealing before any submission does not count as an attempted challenge. Annotated syntax-tree metadata supplies every answer; no tracing or QTI export.

- Binary Builder: 4, 6, 8, or 16 unsigned bits; capacity/maximum, explicitly modeled overflow, and grayscale pixel encoding/storage.
- Boolean Gatekeeper: nested Boolean expressions; evaluate or adjust integer inputs 0–12. Solvability is enumerated.
- List Lab: visual starting list, dynamic drag/drop/touch/keyboard working copy, reusable duplicate bank values, insertion gaps, trash, reorder, undo/reset; one-based INSERT, REMOVE, APPEND; final-state editing or program building, accepting any valid transformation.
- Binary Search Hunt: hidden sorted values, midpoint choices, revealed comparisons, eliminated regions, present and absent targets. Lower midpoint convention.
- Packet Router: available routes, failed links, and additional failures; shortest routes are not required.
- Compression Challenge: text RLE, image RLE, and lossless optimization. Rules are deliberately bounded: 1-byte counts, 1-byte symbols, optional 1-byte image scan header, row/column scans, raw/RLE options. Optimal size is exact within these rules, not among all possible compression formats.
- Data Detective: table sorting/filtering/selection, graph comparisons and correlation, visualization configuration. Fictional datasets; format/unit normalization, deduplication, metadata, and sampling/causation limitations. Correlation is not causation.
- Algorithm Race: count-based comparisons of search, duplicate detection, and total computation; fixed explicit step models and scaled animations.
- Cybersecurity Defender: field inspection of fictional messages, invented practice passwords, reuse and MFA controls. Password-policy compliance does not establish unpredictability. All message domains use reserved .example names and are non-clickable text.
- Parallel Processing Race: exact independent-task makespan; optional dependencies with alphabetical processor queues, exhaustive optimum under that stated queue rule. Zero scheduling overhead; nonpreemptive tasks.
- Network Breaker: preserved graph and minimum-cut implementation with shared reporting, navigation, and spoiler-free feedback. Both /network-breaker.html and the game-folder route retain their public URLs. Uses Edmonds–Karp minimum edge cuts.

- Response Builder: guided frames, explanation arrangement, reduced scaffolds, test evidence, and list/procedure abstraction explanations. Full/Partial/Minimal support is available without progression. Structured responses are scored; free reflection is not.
- Test Case Builder: normal/boundary/branch tests, empty/single lists, documented string library calls, accumulators, logic errors, error-producing indices, and nonexposing tests. Multiple valid inputs are accepted.
- Algorithm Architect: arrange/configure intact blocks for sequencing, arithmetic, selection, iteration, nested IFs/loops, counters, sums, search, and parameterized procedures. Exhaustive small-domain tests plus edge cases accept equivalent configurations, not just the model sequence.
- Computing Impact Lab: supported claim/evidence/explanation construction across innovations, privacy/consent, bias, access, crowdsourcing, rights, and trade-offs. Randomized slots maintain logical consistency; policy reflections are unscored.
- Simulation Lab: seeded independent-trial model with adjustable probability/trial count/seed, running-proportion graph, expected/observed distinctions, model comparisons, and limitations. Running an experiment is not a scored submission.
- Mixed AP Exam Practice: original single/select-two questions across all five Big Ideas, with shared code/data follow-ups. Questions are not official College Board items. Topic breakdown distinguishes question concepts.
- Trivial or Non-Trivial?: classify, compare, and explain whether AP CSP pseudocode constructs do meaningful work for a stated task; four categories, three activities, Beginner/Intermediate/Advanced, filtered Mixed Practice, shareable seeded links, and local Session Summary scoring. “Trivial” and “non-trivial” are instructional descriptions, not College Board scoring categories.

## Tests

From this folder: `npm install`, then `npm test`. The DOM dependency is for tests only and is not loaded by students.

Pure tests cross-check binary conversions, solvable Boolean expressions, list operations, binary search, lossless encodings, packet routes, schedules, and preserved Network Breaker minimum cuts against independent exhaustive calculations. DOM tests exercise all new game modes, correct/incorrect submissions, retries, new challenges, controls, and navigation. DOM simulation does not verify visual rendering, touch hit areas, or CSS layouts on real devices.
Trivial or Non-Trivial? adds 80 authored models (20 per category), 208 behavior-distinct configurations from 240 bounded candidates, 80 independent output oracles, and DOM coverage for all three activity modes, local scoring, share links, reset, and Mixed Practice. Its evaluator verifies a supported pseudocode subset; finite representative-input checks do not prove universal equivalence.

No supported rendered-browser preview was available in the build environment. A final Chromebook/mobile visual check is recommended before assigning. Responsive layouts, keyboard controls, accessible assignment menus, and reduced-motion alternatives are included.

## Publishing and preservation

Deploy by committing only this subdirectory to the existing main branch. GitHub Pages' existing build/deploy workflow handles publication. The root portfolio, Jekyll configuration, and notebooks are unchanged. The legacy /network-breaker.html URL remains working and now shares the reporting and feedback rules.

## Roadmap

Code Concepts is playable at /csp-games/code-concepts/. Reverse questions and computing scenarios are implemented; Teacher Tools and Canvas QTI export are deferred. Variable Tracker, Procedure Tracer, and Bug Hunter are deferred. This collection does not claim full AP CSP curriculum coverage.

Pseudocode follows the College Board exam reference sheet: https://apcentral.collegeboard.org/media/pdf/ap-computer-science-principles-exam-reference-sheet.pdf .

Code Concepts tests: `node concepts-tests.mjs` and `node concepts-ui-tests.mjs` (the latter uses the same test-only linkedom dependency).

Feedback/scoring regression tests: `node concepts-feedback-tests.mjs`, plus per-variant incorrect/retry/reveal UI checks in `concepts-ui-tests.mjs`. First-try accuracy uses challenges with at least one valid answer submission as its denominator; reveals without a submission do not enter it, and retries do not increase it.

## Session reporting

Session Summary: /csp-games/session-summary/. Schema version 1 uses one ID per generated challenge, compact aggregate statistics, and a bounded 256-record retry/deduplication ledger. Refreshing or switching games preserves results. Unfinished challenges replaced or left via pagehide are counted as skipped. Results are local formative evidence, not tamper-proof assessment data. Private browsing or clearing browser data can remove them. Storage failures show a warning and use temporary memory. Unsupported/corrupted data starts a fresh session with a warning.

Reset requires the Cancel/Reset confirmation dialog. It preserves optional identity and clears all performance, with a new session ID and start time. Print uses the browser, with print-specific layout and repeating table headings. Rendered-device and physical print/PDF QA were not available. All 19 games plus the legacy Network Breaker URL report to this same session.

Curriculum matrix: /csp-games/coverage.html, CURRICULUM_COVERAGE.md, and coverage.json. All 35 topics have introductory or applied practice, with 29 classified Practiced and 6 Introduced. These classifications describe bounded modes, not comprehensive mastery of every objective. See the matrix for specific gaps.

## Expansion tests and limitations

`expanded-tests.mjs`, `practice-tests.mjs`, and `practice-ui-tests.mjs` cover expanded concept metadata, reverse-choice uniqueness, all new modes, valid alternatives, shared passages, models, incorrect submissions followed by retries, reveal locks, shared storage, and summary tables. `session-tests.mjs` also verifies that an interaction updates the activity timestamp without adding scoring events.

The new activities use bounded templates. Simulation Lab currently models independent binary events, not a general queue or disease simulator. Structured explanations do not certify unrestricted written responses. Library/string practice is limited to a documented concatenation interface. The coverage matrix lists remaining objectives and authentic project requirements. Teacher Tools / Canvas QTI Export remains deferred. No ChatGPT Sites deployment is created.

The same collection editor is shared with Java Array Lab using an explicit index base. CSP uses one-based positions; Java uses zero-based positions. Their session stores are separate. Java Games: https://davisjm4.github.io/java-games/.
