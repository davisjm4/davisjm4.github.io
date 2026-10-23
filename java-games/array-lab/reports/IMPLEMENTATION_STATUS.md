# Array Lab implementation checkpoint — not ready for publication

The assignment is incomplete. The new generator has not been pushed to main or published. The latest minimum-difficulty gate rejects four Beginner pools, and the required 720-sample instructional review is not complete.

## Implemented in the work branch

* Controlled Java syntax-tree interpreter and renderer; reference aliasing, parameter copying/reassignment, returned references, ragged rows, loops, conditions, and 32-bit integer arithmetic. No dynamic source evaluation.
* Structural fingerprints normalize literal data and names and remove dynamically irrelevant statements. Early termination and meaningful boundary roles are retained. A separate persisted 50-key history spans modes, levels, reloads, and days.
* Diversity-aware bounded scheduling, runtime candidate checks, independent JVM harness, coverage/stress scripts, and a reproducible sample gallery.
* Selection-only updates and swaps, final-state reveal, hidden family labels, difficulty options in all modes, saved preferences, teacher-link parameters, keyboard controls, ragged-grid alignment, and teacher-export adaptations for all twelve modes.
* Legacy generation API and its fixtures remain available for regression testing.

## Current automatic gate results

These are automatically eligible syntax/dataflow keys, not independently human-certified reasoning models. A numeric capacity pass cannot establish instructional validity. Each cell below is model owners with at least six keys / total eligible keys.

| Mode | Beginner models / keys | Intermediate models / keys | Advanced models / keys | Review |
|---|---:|---:|---:|---|
| element | 0 / 7 | 10 / 240 | 10 / 336 | FAIL: Beginner capacity |
| predict-update | 10 / 186 | 10 / 196 | 10 / 210 | Provisional automatic pass; instructional review incomplete |
| perform-update | 0 / 6 | 10 / 240 | 10 / 336 | FAIL: Beginner capacity |
| search | 12 / 624 | 10 / 588 | 10 / 588 | Provisional automatic pass; instructional review incomplete |
| traversal | 10 / 402 | 11 / 449 | 11 / 449 | Provisional automatic pass; instructional review incomplete |
| access-2d | 0 / 5 | 10 / 110 | 10 / 132 | FAIL: Beginner capacity |
| update-2d | 1 / 10 | 11 / 133 | 11 / 123 | FAIL: Beginner capacity |
| nested | 10 / 282 | 10 / 289 | 10 / 266 | Provisional automatic pass; instructional review incomplete |
| reverse | 10 / 98 | 10 / 78 | 10 / 83 | Provisional automatic pass; instructional review incomplete |
| create-references | 11 / 139 | 11 / 152 | 11 / 168 | Provisional automatic pass; instructional review incomplete |
| in-place | 11 / 66 | 11 / 127 | 11 / 132 | Provisional automatic pass; instructional review incomplete |
| trace-2d | 10 / 330 | 10 / 328 | 10 / 314 | Provisional automatic pass; instructional review incomplete |

## Instructional findings and remaining work

Twenty Beginner element-selection samples were individually inspected. Eighteen were provisionally judged too complex for Beginner. Two had algebraic shortcuts or cancelling transformations that made their apparent complexity misleading. All twenty were rejected for redesign. These judgments are assistant inspection, not an independent human review. Seven hundred required samples remain unreviewed. No count of “720 reviewed” is claimed.

The stricter gate now leaves only 7 eligible element structures, 6 perform-update structures, 5 2D-access structures, and 10 2D-update structures at Beginner. Those pools need genuinely foundational replacements; lowering the gate or relabeling models would violate the assignment.

Fingerprint analysis still needs symbolic minimum-path checks for cancelling arithmetic. The earlier zero-repeat key tests do not prove that all keys represent distinct reasoning experiences. The two reviewed shortcut examples demonstrate this limitation.

Additional work: finish the 720-sample review; verify difficulty across all modes; ensure every original specialized topic remains reachable in ordinary student practice; complete final regression, browser, mobile and production checks; update the project tracker after there is a publishable result.

## Verification status

* Earlier development stress: 360,000 per-cell questions, 20,000 Mixed, and 10,000 switching questions completed with no repeated stored key inside 50. These results predate the current stricter gate and are not current acceptance proof.
* Earlier expanded JVM run: 8,753 programs compiled, 8,753 outputs and 8,742 array/reference states compared, 11 intentional bounds exceptions, zero mismatches. The current diagnostic run compiled 8,222 admitted programs, compared 8,222 outputs and 8,212 array/reference states, verified 10 intentional bounds exceptions, and found zero mismatches. Its source digest is in jvm-diagnostic-results.json. This does not certify the missing Beginner pools.
* Legacy Array Lab redesign tests passed: 3,480 generated challenges, 17,486 assertions, 52 compiled snippets. Legacy advanced fixtures remain intact.
* New DOM suite passed before the strict gate: all 12 modes × 3 levels, selection-only updates/swaps, submission locks, links, session persistence and daily reset. It cannot currently pass against the underfilled Beginner pools.
* The broad repository run also reached an unrelated existing RACECES adapter assertion: 23 authored topic IDs versus an expected 15. Those RACECES files were not changed in this work.
* Actual browser verification is incomplete. The connected browser could not reach the workspace development server (connection refused). No production deployment of this branch has occurred.

## Reproduction

```sh
cd java-games
npm install --ignore-scripts --no-package-lock
npm run test:array-compose
npm run test:array-compose-stress
node array-lab/compose/jvm-tests.mjs --diagnostic
```

The first two acceptance commands are expected to fail at the current Beginner capacity gate. Diagnostic JVM success would establish Java execution agreement for admitted candidates, not completion of instructional validation. The compressed gallery is a development snapshot used to document the findings; it is not a reviewed or certified question bank.
