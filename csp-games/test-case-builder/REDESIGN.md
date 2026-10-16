# Test Case Builder — fast practice redesign

This release supersedes the earlier multi-field Test Case Builder. It changes only this game, its shared API registration/adapter, its tests and this report. Other game implementations, the shared session schema, navigation and URLs remain unchanged.

## Student interaction

One short question, one visible answer selection, Check Answer, concise feedback, Next Challenge. There are no answer fields, output-entry rules, dropdown answer choices or test-suite construction steps. Check is disabled until a choice is selected. Selection provides no correctness information. Checking locks the round and identifies the correct answer. A wrong check records an incorrect/revealed round, never independent success. Intentional Show Answer records a reveal without adding an attempt. Next before completion records a skip. Existing session rows are preserved; new results use `quick.<mode>` topic identifiers.

Mixed Practice is the default. Its shuffled category bag presents every category in each five-question cycle without repeating a category across the boundary. Each category has its own shuffled structure bag; a new cycle avoids immediately repeating the last structure. This is variety control, not required progression.

## Reasoning structures

| Mode | Authored structures |
| --- | --- |
| Find the Bug-Exposing Input (12) | strict/inclusive equality; wrong comparison direction; shifted threshold; AND/OR substitution; misplaced NOT; upper endpoint; extra loop update after a cutoff; skipped counter values; conditional wrong initial sum; minimum initialized to zero; omitted last element; returned search value versus position |
| Predict the Result (12) | two-way condition; multi-branch condition; sum; conditional count; product identity; repeated addition; input-dependent REPEAT UNTIL; first-match search; parameterized procedure call; documented concatenation; documented substring; one-based access including errors |
| Boundary Testing (10) | first integer inside a strict region; first excluded upper value; just above a range; just below a range; compound-condition branch transition; just beyond last list position; just before first list position; first input needing two updates; zero/one repetition; first position beyond text |
| Branch Coverage (8) | ELSE; FALSE then TRUE in a chain; nested TRUE/TRUE; nested TRUE/FALSE; compound ELSE; negated ELSE; missing path from an existing pair of tests; final fall-through after two early returns |
| Edge Cases (10) | empty sum; empty product; guard before first-element access; nonempty list with no neighboring pair; missing target in nonempty data; first and last position coincide; zero updates; empty-text guard; too-short character access; documented index precondition |

52 structures in total. Number/name changes are not counted as separate structures. All choices are computed from finite, valid input pools; non-prediction modes choose one qualifying option and three nonqualifying options. Some bugs have many error-exposing inputs; exactly one is displayed in a round. Prediction questions use three or four distinct visible results when misconceptions produce duplicate values. Numeric test choices favor nearby values rather than remote outliers.

## Examples

- Bug input: requirement includes both range endpoints, but the code excludes the upper endpoint. Choose an input producing a mismatch.
- Prediction: an empty product loop returns its initial 1; a parameterized call computes its own result; documented SUBSTRING uses a one-based start and count.
- Boundary: choose the integer just above a valid inclusive range, or the first n that requires a second update of a REPEAT UNTIL loop.
- Branch coverage: two tests cover low and high returns; choose one reaching the remaining path.
- Edge: a single-element list is valid but has no neighboring pair; a guarded empty list avoids values[1]; a nonempty missing-target list reaches the absence result.

## Automated verification

The dedicated suite generates 1,500 questions (300 per mode), covers every structure, independently compiles and executes the displayed AP-style pseudocode with one-based access checks, and cross-checks bug requirements with separately written reference calculations. It checks exactly one valid displayed option, answer positions, unique choices, short prompts/code/feedback, absence of correct-role metadata in controls, all correct/incorrect choices, no second score, intentional reveal, skips, persistence, preservation of old session topics and balanced category/structure cycles.

Latest dedicated run: 48,613 assertions and 60,457 independent displayed-code executions. Fixed-first-position success ranged from 20–25.7%; longest-choice success from 14–31%; copying the first number in the requirement succeeded in 0–14.3%. These measurements detect gross shortcuts; they do not prove that all distractors are equally strong. Some boundary/equality answers legitimately match a stated cutoff. No secure-assessment claim is made.

The full existing CSP suite is also run to regression-test unrelated games and shared reports. Browser completion counts, source-release/deployment evidence and final test results are appended after live verification.

## Layout and timing limits

Game-specific compact CSS preserves shared branding, uses large answer targets, short code with internal horizontal scrolling and two-column choices. No shared stylesheet is changed. The intended reasoning time is 5–15 seconds for prepared students; it is not presented as a measured student usability result. The available browser has no supported viewport-resize or device-emulation capability, so any unperformed Chromebook/mobile viewport checks must be disclosed explicitly. Desktop screenshots and actual rendered bounds are checked during live QA.
