# Mixed Practice audit (Phase 2)

Mixed Practice must do two things for mastery evidence to be trustworthy. It has to reach every mode that can earn credit, and each answer has to be credited to the skill of the question actually shown, never to "Mixed". Both were measured for every Java lab that has a Mixed mode: 420 Mixed questions per lab were drawn from the real engine, answered correctly through the real session tracker and profile client, and normalized by the real server normalizer. Synthetic data and a stubbed network were used throughout.

## Math Lab: why two modes were missing, and the repair

Math Methods & Random Ranges and Numeric Limits, Overflow & Round-off were added after the original five modes, each with its own Beginner, Intermediate and Advanced levels and its own procedural generator. The expansion's README says so directly: Mixed Practice "still draws only from" the original modes. The omission was a deliberate scope choice made when the modes were added, not a technical limit, and it meant answers to those two modes could be earned only in focused practice.

`java-games/math-lab/mixed.js` now builds the rotation from all seven modes in shuffled rounds. Each mode appears once per round and the same mode never appears twice in a row, including across round boundaries. Original-mode questions still come from the existing deck (`deck.next(mode)`) and expansion-mode questions from the existing expansion deck (`expansionDeck.next(mode, difficulty)`), so question generation, explanations and answer checking for each mode are untouched. The page's own difficulty control is now shown in Mixed Practice, relabelled "Methods & limits difficulty", with a one-line note that it applies only to the two expansion modes because the other five have no levels. It defaults to Beginner, so a student gets Intermediate or Advanced questions from Mixed only by choosing them.

Credit follows the question shown: the page titles the question, begins the tracker entry and annotates the evidence from `q.mode`, so the recorded mode and difficulty are those of the drawn question. In 420 Mixed draws every mode is reached at about 14% each (before: five modes at 20%, two at 0%), and 100% of answers credit their own node. In Chromium, 77 Mixed answers (56 on a 1280 by 800 desktop at Intermediate, 21 on a 390 by 844 phone at Advanced) reached all seven modes with every event credited to its own node, and the recorded levels matched the selected ones.

The tests that assumed the old rotation were updated rather than loosened. The expansion UI test used to assert that the difficulty control is hidden in Mixed; it now asserts that it is visible with Beginner as the default, that the label and note are shown, that a changed level is applied to the next expansion draw, that it is hidden again in the five original modes, and that the mode balance across a long Mixed run is even. A separate fresh-deck test checks the round boundary rule with stand-in decks. Nothing was excluded from Math Lab Mixed.

## Coverage matrix

| Lab | Mixed Practice | Modes reached in 420 draws | Most drawn | Least drawn | Answers credited to the shown question's own node |
| --- | --- | --- | --- | --- | --- |
| Math | yes (now 7 modes) | 7 of 7 | modulus 14% | modulus 14% | 420 of 420 |
| Loop | yes | 11 of 11 | components 11% | while 7% | 420 of 420 |
| Array | yes | 12 of 12 | element 8% | element 8% | 420 of 420 |
| Boolean & Conditional | yes | 10 of 10 | identify 11% | short 9% | 420 of 420 |
| ArrayList | yes | 5 of 5 | insert-remove 41% | compare 6% | 420 of 420 |
| LinkedList | yes | 4 of 4 | mutate 27% | link 23% | 420 of 420 |
| Method & Constructor | yes | 9 of 9 | fix 13% | identify-method 9% | 420 of 420 |
| Inheritance & Polymorphism | yes | 5 of 5 | hierarchy 20% | hierarchy 20% | 420 of 420 |
| Search & Sort | no | not applicable | | | not applicable |
| Recursion | yes | 6 of 6 | debug 20% | arrays 15% | 420 of 420 |
| Debugger | yes | 5 of 5 | test 23% | explanation 18% | 420 of 420 |
| Documentation | yes | 5 of 5 | inspector 20% | inspector 20% | 420 of 420 |
| Robot Algorithms | yes | 6 of 6 | conditionals 20% | methods 14% | 420 of 420 |
| Class & Object | yes | 13 of 13 | constructors 10% | structure 4% | 420 of 420 |

Where a row shows the same mode as most and least drawn, the draw is even enough that rounding to a whole percent ties them. The 420 of 420 for the five labs that gained annotations is new: before this package, only 20% to 88% of Mixed answers in Inheritance, Documentation, Robot Algorithms, LinkedList and Method & Constructor credited any node, because the modes that were drawn but unmapped credited nothing. The exact before and after counts are in `EVIDENCE_CREDIT_BEFORE_AFTER.md`.

## What the audit found

No lab credits the wrong node from Mixed Practice. Every question's own mode decides its node, the page never reports "mixed" as the assessed mode, and a forged event that claims "mixed" or a display title credits nothing (tested). The gaps found were gaps of metadata and mapping, and they came in four kinds.

The first kind is verified and fixed here. Boolean & Conditional sent no difficulty even though it shows a difficulty selector, so its events carried none; it now sends the difficulty the question was generated at, and 240 of 240 sampled answers record the difficulty presented (before: 0 of 240). Boolean, LinkedList, Inheritance, Documentation and Robot Algorithms now send the question's own mode and a family id through `java-games/lab-evidence.js`. These are additive annotations: an older cached page that sends none still credits the right node by mode, which a compatibility test confirms for all eleven formerly unmapped modes.

The second kind is the nine new nodes and one widened selector described in `MISSING_MODE_DECISIONS.md`, which is what turned the unmapped Mixed draws into credited ones.

The third kind is a real defect in LinkedList `link`: about 2.2% of draws started already solved, which would hand a student a correct first try in both focused and Mixed Practice. It is fixed in the engine.

The fourth kind is observed but left alone, because each needs a generator or graph-content change that should be calibrated rather than slipped into an evidence package. ArrayList Mixed draws Insert & Remove about 40% of the time against a uniform 20%; every mode is still reached and credited correctly, but an evidence-by-node view would fill the Insert & Remove node faster than the others. Search & Sort has no Mixed mode, so its six modes are practiced in focused mode only, which is not a credit defect. ArrayList, Boolean, Class & Object, Debugger, Recursion, Search & Sort, Method & Constructor and the LinkedList Trace and Collections modes send family ids that the graph does not bind (or send none), so the optional narrowing by family is inactive for them and credit rests on the mode selector, which is correct for every drawn question. The Inheritance and Documentation banks are small (16 to 21 items per mode for Inheritance; about 20 for Editor and 12 for Builder), so a student can meet the same item again across sessions. Each of these has a row in `evidence-gap-registry.json` under `labFindings` with a recommended repair.

## Difficulty inside Mixed Practice

Labs with levels (Math expansion modes, Loop, Array, Boolean, Recursion, Debugger, Class & Object, Search & Sort in focused mode) draw Mixed questions at the level the page's selector is set to, and the event records the level of the question shown. The coverage tests check that equality for every sampled Mixed and focused answer. Labs and modes without levels record no difficulty, and a Beginner answer is never relabelled as something else.

## Not changed

Question generation, difficulty calibration, explanations and the scoring of every mode were not modified, with the single exception of the LinkedList `link` redraw. No Mixed Practice mode was added to Search & Sort, and no rebalancing was done for ArrayList.
