# Java Variable Lab — Scenario-Aware Declaration Validation

Date: October 26, 2026 (America/Los_Angeles)
Baseline: `54c31da9609d6c8a42353b475c164f823894f1e8`.
Game: https://davisjm4.github.io/java-games/variable-lab/
Implementation commit and published browser results: recorded in the verification addendum after deployment.

## Root cause

The preceding instructional-feedback repair deliberately stopped comparing names with the scenario answer, accepting any syntactically legal identifier. That interpretation was too broad for this dropdown activity's instructional objective. `diagnoseAssembly` checked identifier legality, type/value compatibility, and scenario value/type, but had no scenario-name constraint. The original generator still preserved the intended name in `item.name` and `q.answer.name`; the information was available but unused. Its success explanation could therefore incorrectly state that an inappropriate name matched the scenario.

The repair adds scenario meaning to the same existing diagnostic path. It retains the earlier component-specific feedback, Java assignment-conversion rules, progressive hints, scoring and reveal accounting.

## Classroom examples

### Table number

Recovered source: restaurant family, `tableNumber`, range 1–40.

Scenario: “The host seats your group at table 11. Store the table number.”

Before: `int customerName = 11;` received independent credit because the name was legal Java.

After: the declaration receives no independent credit. The only diagnosis is `scenario-name`, affecting only the name field. Feedback acknowledges the data type, assignment operator and value, explains that the declaration is valid Java but does not match the requested information, quotes `customerName` and the scenario's request, and asks the student to reread it. The first hint does not disclose `tableNumber`. The second contrasts the authored meaning of `customerName`: “Store the name on the order.” `int tableNumber = 11;` remains correct.

### Ocean Quest

Recovered source: entertainment family, String item `movieTitle`. Its text options are Ocean Quest, Skyward, The Last Comet and Moonlight Run.

Complete scenario: “Tonight's movie is Ocean Quest. Store the movie title.”

`seatRow` belongs to a distinct char item in the same family: “Your theater seat is in row F/K/D. Store the row letter.” Ocean Quest is a movie title, not a ride name or seating row.

Before: `String seatRow = "Ocean Quest";` received independent credit and misleading success feedback.

After: valid Java, scenario-name error. The type/operator/value are acknowledged as correct; the student is asked to match the name to the movie-title request. The second hint contrasts the authored row-letter request. `String movieTitle = "Ocean Quest";` remains correct. Show Answer explains that `movieTitle` describes the requested movie title.

## Explicit answer contract

Each generated Assemble challenge now carries `contract` with:

- `scenarioText` and `storedInformation`, drawn from the authored prompt/request.
- `expectedType`, `expectedOperator`, `acceptedValues`, and the existing `typeConvention`.
- `acceptedNames`: the canonical `item.name` plus any deliberately authored `item.acceptedNames`.
- `nameMeanings`: each sibling name paired with its source-authored request, used for subsequent contrasts.

There is no name-spelling heuristic, type-based guess, external language model, open-ended input or compilation-only correctness check. Java lexical validity and scenario-name membership are separate requirements. Invalid identifiers receive the existing syntax diagnosis; legal but unaccepted names receive the new scenario diagnosis. Accepted literal equivalents retain the existing Java-aware comparison. Identity/widening/narrowing rules and the explicit introductory type convention are preserved.

`buildAssembleChallenge` constructs the same existing activity and choices, with a reusable pure construction seam for enumerating source scenarios in tests. Ordinary generation continues using the original balanced type queue, scenario selection, 21 families, random draws and recent-family rules. No question family, difficulty level or content item was added.

Existing scenarios have one accepted name each. An explicit-alias test proves that an intentionally authored alternative can be included in the dropdown and accepted; the same spelling remains rejected in an unmodified challenge. Open-ended semantic naming is outside this repair.

## Catalog audit and ambiguity

All 105 items in all 21 families were reviewed against their complete situation and request. Each canonical identifier describes the requested information. Each family has five different properties; all four possible sibling-name distractors were reviewed, rather than only the two selected for a particular challenge. No ambiguous existing dropdown alternatives were found. No scenario wording changes or additional aliases were needed.

The table example uses `tableNumber`, and Ocean Quest uses `movieTitle`. Names need not be unique across all conceivable Java programs; they must match an explicitly authored choice for this particular scenario. See `SCENARIO_NAMING_AUDIT.md` for the complete 105-row review and `scenario-validation.json` for every reviewed scenario, accepted names, potential distractors, and all tested values.

## Feedback, retries and reveal

For name-only mistakes, feedback identifies valid Java versus scenario correctness and acknowledges the three correct fields. It avoids unrelated type/operator lessons and does not reveal the intended identifier on the first hint. The second hint uses the selected name's authored request for a concrete contrast. Multiple mistakes remain numbered and independently diagnosed. Fixing a scenario-name error produces the existing progress acknowledgement.

Successful/revealed declarations now explain how the accepted name describes the requested information. Show Answer remains a reveal and never earns independent credit. Correct answers after an incorrect attempt earn solved-after-retry credit, preserving the original first-try result. No scoring, tracker, session or storage implementation changed.

## Files modified

- `java-games/engine.js`: assemble contract construction and cache version for the feedback helper.
- `java-games/variable-lab/feedback.js`: authored scenario-name diagnosis, correct-field acknowledgement, later contrast, and accepted-name explanation.
- `java-games/app.js` and `java-games/variable-lab/index.html`: import/script cache versions only; application event/scoring logic unchanged.
- `java-games/quality-tests.mjs`: restore rejection of legal but inappropriate name options using the explicit contract.
- `java-games/variable-lab/feedback-tests.mjs` and `feedback-ui-tests.mjs`: update the prior blanket-name expectations and expose the existing DOM harness for exact classroom scoring tests.
- `java-games/variable-lab/scenario-validation-tests.mjs`: systematic catalog, generation, classroom, Java-compiler and DOM scoring regression coverage.
- `.github/workflows/trace-repair-check.yml`: run the new focused scenario suite in the established Java verification job.
- Variable Lab reports and verification fixtures: this report, naming audit, raw logs, JSON evidence and exact browser fixtures. No fixture override was added to the student game.

## Automated validation

- 305,817 scenario assertions passed: systematic enumeration of all 105 source items, every existing String/char/Boolean variant and numeric endpoints, all catalog names as potential inappropriate substitutions, plus 3,000 ordinary generated challenges across three supplied difficulty options. Assemble has no difficulty-specific levels; these options confirm unchanged behavior.
- Both classroom cases reject only the name and accept their canonical declarations. Tests cover invalid names, wrong types/operators/values, multiple errors, explicit aliases, second hints, answer concealment, success/reveal explanations, retry/reveal/first-try counters and completion locks.
- Java 17 compiler oracle verified 212 declarations, including all 105 canonical examples and 105 syntactically valid wrong-name declarations, plus both exact classroom mistakes. The wrong-name declarations compile while the activity rejects their scenario meaning.
- Previous feedback regression: 63,851 assertions passed across 900 Identification and 300 Assemble challenges, with 44 compiler checks.
- Exact classroom DOM suite: 45 checks passed.
- Existing Variable Lab quality suite passed: 1,000 Assemble samples (exactly 20% per type), 21 families and unchanged recent-family behavior; 1,800 Identification samples; 1,330 compiler checks and 60 JVM reassignment/cast result checks.
- Existing shared engine: 8,400 seeded challenges passed. Shared DOM: 4,917 checks passed, including unrelated original games and Session Summary. Daily-boundary/migration/per-mode session tests passed. Unmodified Trace adapter tests passed (70 challenges). Catalog/navigation checks passed.

Reproduce from `java-games/` after installing its existing dependencies:

```sh
JAVA_BIN=java VARIABLE_SCENARIO_EVIDENCE=/tmp/variable-scenarios node variable-lab/scenario-validation-tests.mjs
JAVA_BIN=java node variable-lab/feedback-tests.mjs
node variable-lab/feedback-ui-tests.mjs
node quality-tests.mjs
node session-tests.mjs
node tests.mjs
node ui-tests.mjs
node variable-lab/trace-tests.mjs
node ../cs-games/catalog-tests.mjs
```

This repair ran the focused and relevant existing suites above. It did not rerun or repair unrelated previously documented full-suite failures in Debugger, RACECES and Search/Sort. CI/deployment and direct browser verification are recorded in the addendum after publication.

## Scope and limitations

Identification feedback and validation, Trace implementation, content catalog, difficulty selection, dark styling, dropdown interface, navigation, retry/Show Answer/Next controls, scoring, Session Summary, storage and daily behavior are preserved. Shared-file behavioral changes are restricted to Assemble diagnosis/contract construction; application imports were versioned for cache refresh.

Teacher Tools, QTI, other Java games, CSP, WPR/RACECES and the master tracker were not changed. Concurrent upstream changes are protected by an expected-head branch update. Names are accepted through explicit dropdown metadata, not open-ended semantic inference. The underlying literal validator retains its previously documented bounded Java subset. Browser verification uses desktop Chrome and a 390 CSS-pixel viewport rather than physical Chromebook/phone hardware.
