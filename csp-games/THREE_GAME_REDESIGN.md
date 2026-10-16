# Three game instructional redesign

Primary references: CSP_Java_Games_Audit_Report.docx and CSP_Java_Games_Audit_Matrix.xlsx (October 15, 2026), including the findings log, structural inventory and R13/R15–R18 roadmap. Changes are limited to Test Case Builder, Algorithm Architect and Response Builder. GitHub Pages remains the only deployment target. No session schema change or student-data transmission.

## Test Case Builder

Dedicated `test-case-engine.js` and `test-case-ui.js` replace this game's use of the shared practice engine/UI. Unrelated games continue to load their original modules. The existing URL, all nine practice modes, Mixed default, navigation and shared browser-local session tracker are preserved.

- Boolean requirements cover strict/inclusive comparisons, equality/inequality, inclusive ranges and their complements, compound AND/OR, NOT and exception handling. Defects include comparison direction, missing equality, wrong constant, range endpoint, AND/OR substitution, missing/misplaced NOT and branch order. Boundary tests accept either direction of any adjacent pair switching the required result. Normal tests accept TRUE or FALSE examples away from comparison constants.
- Real branch-coverage programs: IF with a default result, IF/ELSE, a three-way conditional chain, a compound-condition branch and nested conditionals. Any input reaching the named actual-program path is accepted. Output predictions are checked against actual code, not an unstated requirement interpretation.
- Lists: matching count, sum, product, minimum, maximum, search, first/last access, all-satisfy, skipped-first traversal and an unsafe minimum assumption. Empty and single inputs have explicit preconditions. Empty input is not automatically an error.
- Strings: argument-order concatenation, length, substring, character access, nested operations, conditional processing and empty handling. Documentation defines all nonstandard library behavior and one-based positions. Text results use quoted strings to distinguish empty output from a missing answer.
- Iteration: constant accumulation, multiplication, conditional counting, decrementing accumulators, input-dependent REPEAT UNTIL and an off-by-one REPEAT defect; zero, one and multiple iterations are generated only when possible.
- Error-producing tests vary length and index calculations. Students must make the first access succeed and the second fail, and predict the prior output, rather than entering a constant invalid index and selecting an already-disclosed error label.
- One scored submission for these short tasks. A wrong submission records an incorrect attempt and a disclosed answer, closes independent scoring, and shows the student's generated trace plus an example valid test. Revealing before submitting does not add an attempted challenge. No retry can inflate first-try or eventual independent success.

Scoped audit findings addressed in this implementation: F17–F21, and question-specific feedback / short-item attempt portions of F03 and F05. These shared findings remain open for unrelated games.

Automated checks: `CSP_DOM_LIBRARY=/path/to/linkedom node csp-games/test-case-redesign-tests.mjs` — 2,700 randomized challenges, at least five authored structures per mode, independent execution of displayed Boolean expressions, valid alternatives across the integer domain, empty/single edge invariants, mutated wrong outputs, old memorized-response and threshold-copy strategies, session persistence and single-submission locks. The full existing CSP regression suite also passed. The old audit strategy `100, TRUE` fails all modes in the sampled set; threshold-copy is reduced but can still legitimately expose some Boolean defects. Shortcuts are measured, not treated as proof of instructional quality. This design does not claim that an arbitrary fixed Boolean guess has no chance of success.

Browser verification is performed on the deployed GitHub Pages version before the second game's implementation begins. Device/viewport checks and unresolved limitations will be recorded after inspection.

## Algorithm Architect

Pending. No generator/interface changes in this phase.

## Response Builder

Pending. No generator/interface changes in this phase.
