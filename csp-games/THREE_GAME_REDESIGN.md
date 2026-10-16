# Three game instructional redesign

Primary references: CSP_Java_Games_Audit_Report.docx and CSP_Java_Games_Audit_Matrix.xlsx (October 15, 2026), including the findings log, structural inventory and R13/R15–R18 roadmap. Changes are limited to Test Case Builder, Algorithm Architect and Response Builder. GitHub Pages remains the only deployment target. No session schema change or student-data transmission.

## Test Case Builder

Dedicated `test-case-engine.js` and `test-case-ui.js` replace this game's use of the shared practice engine/UI. The shared practice API delegates Test Case Builder requests to the new generator, and obsolete tests that locked in memorized answers are replaced. Unrelated game behavior is preserved. The existing URL, all nine practice modes, Mixed default, navigation and shared browser-local session tracker are preserved.

- Boolean requirements cover strict/inclusive comparisons, equality/inequality, inclusive ranges and their complements, compound AND/OR, NOT and exception handling. Defects include comparison direction, missing equality, wrong constant, range endpoint, AND/OR substitution, missing/misplaced NOT and branch order. Boundary tests accept either direction of any adjacent pair switching the required result. Normal tests accept TRUE or FALSE examples away from comparison constants.
- Real branch-coverage programs: IF with a default result, IF/ELSE, a three-way conditional chain, a compound-condition branch and nested conditionals. Any input reaching the named actual-program path is accepted. Output predictions are checked against actual code, not an unstated requirement interpretation.
- Lists: matching count, sum, product, minimum, maximum, search, first/last access, all-satisfy, skipped-first traversal and an unsafe minimum assumption. Empty and single inputs have explicit preconditions. Empty input is not automatically an error.
- Strings: argument-order concatenation, length, substring, character access, nested operations, conditional processing and empty handling. Documentation defines all nonstandard library behavior and one-based positions. Text results use quoted strings to distinguish empty output from a missing answer.
- Iteration: constant accumulation, multiplication, conditional counting, decrementing accumulators, input-dependent REPEAT UNTIL and an off-by-one REPEAT defect; zero, one and multiple iterations are generated only when possible.
- Error-producing tests vary length and index calculations. Students must make the first access succeed and the second fail, and predict the prior output, rather than entering a constant invalid index and selecting an already-disclosed error label.
- One scored submission for these short tasks. A wrong submission records an incorrect attempt and a disclosed answer, closes independent scoring, and shows the student's generated trace plus an example valid test. Revealing before submitting does not add an attempted challenge. No retry can inflate first-try or eventual independent success.

Scoped audit findings addressed in this implementation: F17–F21, and question-specific feedback / short-item attempt portions of F03 and F05. These shared findings remain open for unrelated games.

Automated checks: `CSP_DOM_LIBRARY=/path/to/linkedom node csp-games/test-case-redesign-tests.mjs` — 2,700 randomized challenges, at least five authored structures per mode, independent execution of displayed Boolean expressions, valid alternatives across the integer domain, empty/single edge invariants, mutated wrong outputs, old memorized-response and threshold-copy strategies, session persistence and single-submission locks. The full existing CSP regression suite also passed. The old audit strategy `100, TRUE` fails all modes in the sampled set; threshold-copy is reduced but can still legitimately expose some Boolean defects. Shortcuts are measured, not treated as proof of instructional quality. This design does not claim that an arbitrary fixed Boolean guess has no chance of success.

Public Chrome verification passed all nine modes: ten independently correct submissions, two realistic incorrect submissions, a reverse-ordered boundary pair, normal FALSE, a valid empty list, negative singleton, Unicode text, zero iterations and terminal scoring locks. Documentation is separated from code for wrapping. Desktop layout was inspected. The connected local-browser session failed; cloud Chrome has no supported viewport-resize control, and native zoom/device shortcuts had no effect. Mobile and Chromebook-sized viewport verification remain an explicit limitation, rather than being represented as passed.

## Algorithm Architect

Dedicated `architect-engine.js` and `architect-ui.js` implement a bounded pseudocode interpreter. Every existing mode and Mixed default remain. Students arrange individual assignments, headers, conditions, updates, returns and closing braces; optional competing initializations, comparisons, arithmetic updates and returns remain in the bank. They control block placement and nesting. The validator checks behavior across each challenge's declared finite input domain, not a required block order or exact block count. Execution has a development-independent client-side instruction budget to handle nontermination safely.

| Mode | Authored structures |
| --- | --- |
| Sequencing | affine transformation with rational alternatives; exchange using a temporary; dependent variable updates; two intermediate values; add then divide |
| Selection | absolute value; maximum of two; clamping; sign classification; strict range membership |
| Iteration | sum through n; decrementing factorial; repeated product/power; input-dependent stepping; conditional even sum |
| Nested loops | sum over ordered pairs; compare ordered pairs; rectangular repetition; triangular repetition; ragged-row traversal |
| Nested conditionals | inclusive-range count; positive-even sum; sign text; flag-dependent branches; weighted sign categories |
| Counters | count all; count matches; adjacent transitions; run count with empty case; count before sentinel |
| Accumulators | sum; product identity; guarded maximum; guarded mean; position-weighted sum |
| Searching | first target index; last target index; target existence; first positive position; adjacent equal pair |
| Procedures and parameters | argument ordering for difference; weighted parameters; composed calls; Boolean helper result; square of a difference |

Numeric comparison uses a relative/absolute tolerance for numeric results and structural/type checks for other values. Rational expressions are rendered as division expressions, never long decimal artifacts. First/last search positions are one-based; absent results and empty inputs are included. Different algorithms and harmless additional components are accepted when they satisfy the goal over the entire allowed domain. The finite domain is stated so test coverage is not presented as a proof over arbitrary inputs.

Wrong constructions show a specific failing input, expected return, actual return or execution error, and a short condition/update trace. Syntax failures also show the input that cannot execute. Students can revise independently; the original submission remains in first-try statistics. Reveal closes scoring.

Automated validation: 900 randomized constructions across all 45 structures; 695,814 allowed-domain input executions; 9,261 integrity/interaction assertions; 60 equivalent rational add-then-multiply alternatives accepted. Independent initialization orders accepted. Fixed initialization/loop/return strategies fail the new integrity checks. Public desktop Chrome verification passed all nine modes and Mixed, including rational equivalent sequencing, reordered independent conditions, ordered first-match search over 7,380 inputs, factorial/product identities, nested repetition, and independent revision after concrete failing inputs. Eleven challenges were completed with 8 first-try successes and 3 after-revision completions; first-try remained 8/11. The final case intentionally reversed helper arguments, showed the concrete wrong Boolean return, and accepted a keyboard-assisted correction. Procedure traces identify their scope so a helper RETURN is not confused with the caller returning. Mobile/Chromebook viewport verification remains unavailable as recorded above.

Scoped findings F22–F24 are addressed in the implementation; shared F03/F05 are addressed only for the authorized games.

## Response Builder

Dedicated `response-engine.js` and `response-ui.js` replace this game's shared interface while preserving its five modes, Mixed default, URL, navigation and local session data. Full Support is the default.

Ten procedure families are available in every mode: qualifying count; sum; product; first matching one-based index; strict filtering into a list; guarded maximum; all-positive predicate; inclusive range classification; parameterized multiplication then addition; reverse traversal. Different inputs, boundary values and empty cases are generated. Two actual calls use the same definition with contrasting computed returns, so abstraction claims have visible evidence of reuse. Procedure names are neutral rather than announcing the computation.

Guided and Explanation modes explain overall behavior; Reduced Scaffold explains a particular returned value; Test Explanation identifies what a chosen case checks and its limitations; Abstraction explains list traversal or parameterized reuse. Candidates describe the displayed operations and common misconceptions (count/sum, comparisons, early RETURN, identity values, one-based search, list APPEND, RETURN/DISPLAY, parameter/argument behavior). There are no correct-role labels in the candidate bank; identifiers and positions are shuffled. Distractors remain about the actual procedure.

- Full Support: three organizational destination sections, each with plausible statement choices. Section labels identify the destination, never a correct candidate.
- Partial Support: choose three sentences from a mixed, unlabeled bank and arrange the explanation.
- Minimal Support: select relevant processing evidence directly in the code, then choose and arrange a claim and connection from an unlabeled bank. No unrestricted writing or keyword grading.
- Both claim/evidence/connection and evidence/claim/connection are accepted at Partial Support. The connection explicitly refers to the preceding evidence and conclusion, so placing it first is rejected with an explanation. Minimal Support replaces the evidence sentence with actual code selection.
- Changing support starts a new challenge with a new identifier. New topic rows include the support level (for example `Test Explanation · Minimal Support`); legacy session data is left intact and is not relabeled as though its support were known.
- One scored submission closes the short task, shows actual returns for both calls and a worked claim/evidence/connection, and explains selected misconceptions using the generated problem. Incorrect submissions are also marked revealed; no later click can count as independent correctness. Intentional reveal without a submission does not count as attempted.

Automated checks: 3,000 randomized questions, 200 per mode/support pair, with all ten procedure families observed in each pair; 67,631 behavior/integrity/UI assertions. Native output models are cross-checked against separately written reference loops for supplied calls and edge inputs, including empty lists, negative values, zero, inclusive endpoints and missing search results. Tests cover default settings, mode/support changes, coherent alternative order, arbitrary order rejection, direct code evidence, wrong answers, reveal locks, repeated checks, cross-refresh persistence and all 15 support-specific topic rows.

Shortcut experiments deliberately give position/length strategies perfect code evidence and coherent sentence order. Across the 15 mode/support pairs, choosing the first candidate per role succeeds in 2–16.5% of sampled challenges; choosing the longest per role succeeds in 0–39%. This is substantially below the old role-label shortcut (which disclosed all components), but length and generic test-scope statements remain partial clues. The library is finite and its statements can eventually be learned; the redesign does not claim resistance to memorization or secure assessment. Representative generated code and feedback were manually reviewed in addition to automated checks.

Scoped findings F25–F27 and the authorized-game portions of F03/F05 are addressed in implementation. Public browser verification and final deployment evidence are recorded after release below.

## Scope and verification limits

No Java Games files, unrelated game implementations, session schema, branding or hosting configuration were changed. Shared practice API wrappers delegate only these three games to isolated implementations. Existing generator/interaction/session/report regression suites are retained, except assertions that required the audited flaws were replaced with behavioral checks. No Sites deployment was created or updated.

Mobile and Chromebook-sized rendered viewport checks remain pending because this session's browser exposes no supported resize or device-emulation control. Mouse/keyboard behavior is covered by public desktop Chrome and DOM interaction tests; 44-pixel code-evidence controls, preserved indentation, internal horizontal code scrolling, wrapping prose and responsive existing layout are implemented. These checks do not substitute for real touch-device QA. The report's print action and reset confirmation/cancel/confirm are regression-tested in a DOM environment; rendered PDF/physical print inspection was not performed.

