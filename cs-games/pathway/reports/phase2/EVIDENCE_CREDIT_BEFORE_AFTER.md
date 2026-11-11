# Evidence credit before and after (Phase 2)

This report measures what a student's correct first-try answer credits, before and after this package, through the same path production uses: engine question, session tracker, profile client, outbox event, server normalizer, node match. All data is synthetic and the network is stubbed. The numbers are reproduced by `node cs-games/pathway/tests/measure-credit-before-after.mjs` and stored in `before-after-credit.json` beside this file.

## How "before" is reproduced

The evidence pipeline (the session tracker, the profile client, the server normalizer and the node matcher) is byte-identical between the Phase 1 commit `fc70e68` and this branch; `git diff fc70e68 -- wpr-games cs-games/pathway/evidence.mjs java-games/session.js` is empty. So "before" needs only two things swapped inside the same process: the service-side curriculum graph is replaced by the graph committed at `fc70e68`, and the five pages Phase 2 changed are driven the way Phase 1 drove them (no evidence annotation for Boolean, LinkedList, Inheritance, Documentation and Robot Algorithms; Math Lab Mixed drawing only the five original modes, with expansion questions annotated as they were). The base commit `422398d` has 280 nodes and 296 families, Phase 1 has 281 and 358, and Phase 2 has 290 and 453; for the labs measured here the base and Phase 1 graphs behave the same, because Phase 1 changed Variable Lab and String Lab only.

Seed 20261112; focused draws per mode: 12 (24 when the lab has difficulty levels), Mixed draws per lab: 420. Graphs: base 422398d 280 nodes / 296 families; Phase 1 fc70e68 281 / 358; Phase 2 290 / 453.


### A. The eleven previously unmapped modes (correct first-try answers, real flow)

| Game | Mode | Before: questions that credit the intended node | After: questions that credit the intended node |
|---|---|---|---|
| method-constructor-lab | order-args | 0/12 | 12/12 |
| linkedlist-lab | link | 0/12 | 12/12 |
| linkedlist-lab | mutate | 0/12 | 12/12 |
| inheritance-polymorphism-lab | hierarchy | 0/12 | 12/12 |
| inheritance-polymorphism-lab | override | 0/12 | 12/12 |
| inheritance-polymorphism-lab | tracer | 0/12 | 12/12 |
| inheritance-polymorphism-lab | debug | 0/12 | 12/12 |
| documentation-lab | editor | 0/12 | 12/12 |
| documentation-lab | builder | 0/12 | 12/12 |
| robot-algorithms | build | 0/12 | 12/12 |
| robot-algorithms | debug | 0/12 | 12/12 |

### B. Math Lab Mixed Practice (share of Mixed questions per mode)

| Mode | Before | After |
|---|---|---|
| modulus | 20% | 14% |
| division | 20% | 14% |
| casting | 20% | 14% |
| expressions | 20% | 14% |
| reverse | 20% | 14% |
| math-methods | 0% | 14% |
| numeric-limits | 0% | 14% |

### C. Mixed Practice: questions that credit exactly the question's own node

| Game | Before | After |
|---|---|---|
| math-lab | 100% (420/420) | 100% (420/420) |
| loop-lab | 100% (420/420) | 100% (420/420) |
| array-lab | 100% (420/420) | 100% (420/420) |
| boolean-conditional-lab | 100% (420/420) | 100% (420/420) |
| arraylist-lab | 100% (420/420) | 100% (420/420) |
| linkedlist-lab | 53% (222/420) | 100% (420/420) |
| method-constructor-lab | 88% (370/420) | 100% (420/420) |
| inheritance-polymorphism-lab | 20% (84/420) | 100% (420/420) |
| recursion-lab | 100% (420/420) | 100% (420/420) |
| debugger-lab | 100% (420/420) | 100% (420/420) |
| documentation-lab | 60% (252/420) | 100% (420/420) |
| robot-algorithms | 66% (278/420) | 100% (420/420) |
| class-object-lab | 100% (420/420) | 100% (420/420) |

A Mixed question can only credit its intended node when its mode has one; in "before" the modes of section A had none, so the share below 100% is exactly those modes.

### D. Boolean & Conditional: difficulty recorded equals the difficulty presented

Before: 0/240. After: 240/240.

### E. Family ids bound to the credited node (narrowing active), questions answered correctly in focused practice

| Game | Before | After |
|---|---|---|
| linkedlist-lab | 0/48 | 24/48 |
| inheritance-polymorphism-lab | 0/60 | 60/60 |
| documentation-lab | 0/60 | 60/60 |
| robot-algorithms | 0/72 | 72/72 |
| boolean-conditional-lab | 0/240 | 0/240 |

### F. Focused-practice credit in every measured lab (questions credited to the intended node)

| Game | Before | After |
|---|---|---|
| math-lab | 108/108 | 108/108 |
| loop-lab | 264/264 | 264/264 |
| array-lab | 288/288 | 288/288 |
| boolean-conditional-lab | 240/240 | 240/240 |
| arraylist-lab | 60/60 | 60/60 |
| linkedlist-lab | 24/48 | 48/48 |
| method-constructor-lab | 96/108 | 108/108 |
| inheritance-polymorphism-lab | 12/60 | 60/60 |
| search-sort-lab | 144/144 | 144/144 |
| recursion-lab | 144/144 | 144/144 |
| debugger-lab | 120/120 | 120/120 |
| documentation-lab | 36/60 | 60/60 |
| robot-algorithms | 48/72 | 72/72 |
| class-object-lab | 312/312 | 312/312 |

## First-attempt rules after the change

The first-attempt rules were not changed and were re-verified for the eleven newly credited modes, in `java-evidence-coverage.test.mjs`. A wrong answer followed by a correct one stays a miss: the first submission produces `n=1, c=0` and the retry produces no node evidence. A hint, a revealed answer and a skip each credit nothing. A second submit of the same question counts once. A retry or an assisted event never creates node evidence even when its fields are otherwise valid. Credit follows the question actually shown, so Mixed is never reported as the assessed mode, and the difficulty recorded is the difficulty presented (checked for every sampled focused and Mixed answer in every lab). Annotations do not change session totals: a test runs the same questions through a tracker with and without annotations and compares the daily summaries, which are identical.

## Negative controls

Misattributed events credit nothing. An Inheritance event that claims a different mode than its family belongs to credits no node; an event whose assessed mode is "mixed", a display title, a mode of a different lab, or an invented mode credits nothing; an unregistered activity or a tampered event id is rejected. A separate control removes a node's selector from the service-side graph and confirms the measurement then credits nothing for that mode and the classifier stops calling it supported. Nine regression controls restore Phase 1 files into a copy of the tree (the Phase 1 graph, the Phase 1 Math Lab page, the Phase 1 LinkedList engine, the Phase 1 Boolean page, the Phase 1 pages of the other four labs) or apply a targeted fault (Robot reporting "mixed", Math Mixed without the two expansion modes, `order-args` dropped from `match-call`, a tampered registry), and every one makes the Phase 2 tests fail while the unmodified copy passes. The log is `negative-controls.log` in the package.

## Limits of this measurement

These are counts of synthetic questions, not student results, and nothing here estimates how students perform. Evidence that students already submitted before this release is not changed: the service stored each event's node dimensions at the time it arrived, so earlier answers to the eleven modes keep their empty dimensions. The stored events also keep their mode, so a backfill could attribute them later, but that is a database operation outside this package and has not been done or approved.
