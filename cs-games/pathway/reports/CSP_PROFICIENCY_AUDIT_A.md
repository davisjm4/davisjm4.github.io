# AP CSP proficiency audit A: Boolean Gatekeeper, List Lab, Algorithm Architect

Branch `claude/csp-proficiency-expansion-a`, on `main` at `440a7ef` (PR #26). Reproduce every number with the scripts in [`../audit/csp-proficiency-a/`](../audit/csp-proficiency-a/). Samples are random, so figures move by about a point between runs.

## 1. Outcome

**No new proficiency level is justified by the current content, so none was added.** The tier columns for all seven skills are identical before and after (the regenerated matrix changes one cell: Iteration's recommended Level 3 practice mode).

The task as written assumed AP CSP had almost no Level 3 support. PR #26 landed first and already enabled Level 3 for all three games. So this build audited that work against the questions the games actually generate. It found three weak Level 3 paths and repaired them, which makes Level 3 more trustworthy and somewhat slower to reach.

| Finding | Evidence | Repair |
| --- | --- | --- |
| Boolean "make it TRUE" questions that guessing often passes were Level 3 evidence | A random input pair reaches 7 of 8 about **4.6%** of the time across the questions the rule admitted | Level 3 family only when at most 25% of input pairs open the gate (luck falls to about **0.002%**) |
| Architect counter increments counted as Level 3 | The answer is always `result ← (result + 1)`; distractors are constants (`1`, `-1`, `result × 1`) | Labelled `update-count`, practice only |
| Architect direct procedure calls counted as Level 3 | In variants 0, 1 and 3 the goal states the call, e.g. "Return the result of difference(a,b)" and the answer is `result ← difference(a, b)` | Labelled `procedure-call-direct`, practice only |
| A first draft of the repair made Iteration unreachable | The recommended mode (Nested) was left with 2 reasoning models; Level 3 needs 3; 40 of 40 simulated students never reached it | Recommended Iteration mode is now Iteration (4 models). A test now follows the product's own recommendation. |

## 2. Before and after

### Tier support (formative levels, from the shared matrix)

| Skill | Level 2 | Level 3 | Level 4 |
| --- | --- | --- | --- |
| Boolean expressions (`CSP-BOOLEAN`) | Supported (via Code Concepts), unchanged | Supported, **tightened** | Unavailable |
| Lists (`CSP-LISTS`) | Supported (via Code Concepts), unchanged | Supported, unchanged | Unavailable |
| Sequence (`CSP-SEQUENCE`) | Unavailable | Supported, unchanged | Unavailable |
| Selection (`CSP-SELECTION`) | Supported (Code Concepts), unchanged | Supported, **tightened** | Unavailable |
| Iteration (`CSP-ITERATION`) | Supported (Code Concepts), unchanged | Supported, **tightened** | Unavailable |
| Algorithms (`CSP-ALGORITHMS`) | Unavailable | Supported, unchanged | Unavailable |
| Procedures (`CSP-PROCEDURES`) | Supported (Code Concepts), unchanged | Supported, **tightened**; needs 2 models instead of 3 | Unavailable |

### Share of generated questions that carry Level 3 evidence (Architect; 700 per mode)

| Skill · mode | Before | After | Reasoning models (mode:variant) |
| --- | ---: | ---: | --- |
| Selection · nested-selection | 68% | 45% | 5 → 5 |
| Selection · selection | 14% | 14% | 2 → 2 |
| Iteration · iteration | 88% | 73% | 5 → 4 |
| Iteration · accumulator | 64% | 64% | 5 → 5 |
| Iteration · nested | 79% | 31% | 5 → 2 |
| Iteration · counter | 74% | **6%** | 5 → 2 |
| Sequence · sequence | 37% | 35% | 5 → 5 |
| Algorithms · search | 45% | 45% | 4 → 4 |
| Procedures · procedure | 86% | **34%** | 5 → 2 |

### Effort to reach Level 3 (simulated student, every answer correct; median questions, p90 in brackets)

| Skill | Before | After |
| --- | ---: | ---: |
| Boolean (make mode) | 30 (45) | **48 (72)** |
| Lists (execute) | 9 (12) | 9 (12) |
| Selection | 9 (15) | 15 (21) |
| Iteration | 9 (12) | 9 (12); mixed modes 9 → 15 |
| Sequence | 18 (24) | 15 (27) |
| Algorithms | 15 (21) | 15 (21) |
| Procedures | 6 (9) | **18 (27)** |

Every skill stays reachable. Boolean is the heaviest at about 48 questions, because about 1 in 6 make-mode questions is both-inputs and sparse. That is an educator decision (section 8); the alternative is a generator change that raises the share of such questions, which this build did not make.

## 3. Boolean Gatekeeper

**Modes:** Evaluate expression (output switch TRUE/FALSE) and Make it TRUE (choose x and y from 0 to 12; any pair that opens the gate counts).

**Evaluate** is always a compound expression of depth two (1 comparison 13%, 2 comparisons 30%, 3 comparisons 29%, 4 comparisons 27%), but the answer is a coin flip (49.8% TRUE) and the question names the values. It carries no reasoning-family metadata, so it stays practice. It could support Level 2 only with a larger floor: guessing passes 4 of 5 about 19% of the time, so a rule would need roughly 9 of 10 (about 1%).

**Make** (24% of questions need both inputs; of those, 69% have AND at the root, 25% NOT, 5.5% OR):

| Level 3 requires | Why it is Level 3 |
| --- | --- |
| No single value of x or y opens the gate on its own | The learner must coordinate both inputs across a compound condition (always at least two comparisons and two operator layers) |
| At most 25% of the 169 pairs open the gate | A random pair then passes at most a quarter of the time |

Real questions (from the generator):

| Question | Open pairs | Verdict |
| --- | ---: | --- |
| `((y = 0) AND (x < 11)) AND ((x ≥ 4) OR (y = 4))` | 7 of 169 (4%) | Level 3 evidence: y is forced to 0, which then forces x into 4–10 |
| `(NOT (x ≤ 2)) AND ((y ≤ 0) OR (y > 12))` | 10 of 169 (6%) | Level 3 evidence |
| `(NOT (x ≥ 8)) AND (NOT (y < 2))` | 88 of 169 (52%) | Both inputs matter, but a random pair passes half the time: practice |
| `NOT (NOT (y ≠ 6))` | 156 of 169 (92%) | One input is enough: practice |

Guessing exposure over the 8 answers the rule needs: any both-inputs question **4.6%**; density at most 0.25 **0.002%**; at most 0.15 under 0.001%.

**Level 4: unsupported.** Needs a transfer bank the game does not have: logical equivalence and De Morgan rewriting, a condition inside a short program, spotting a defect in a faulty condition, or reasoning about two conditions that interact.

## 4. List Lab

**Modes:** Execute the code (apply four INSERT/APPEND/REMOVE operations to a list and show the final list) and Build the code (any program that reaches a target list).

| Question | Share | Reading |
| --- | ---: | --- |
| Execute with at least two non-append operations | 88% across 72 of 81 operation patterns | Level 3 (unchanged): later operations refer to positions the earlier ones moved |
| Execute with 0 or 1 non-append operation | 12% | Too rare to support a foundational tier by itself |
| Build the code | n/a | Practice: any program that works is accepted, so a short workaround scores |

A learner with a common misconception still passes only a small share of the qualifying questions: 0-based indexing **2%**, reversed order **6%**, treating indices as the original positions **24%**. None can sustain 85%, so the rule is sound. About 30% of qualifying questions would not catch at least one misconception; tagging "shift-dependent" questions would sharpen the evidence and is a refinement, not a defect.

Example (a Level 3 execute question): `numbers ← [4,8,4,1,7,3]`, then `REMOVE(numbers, 4)`, `INSERT(numbers, 2, 9)`, `INSERT(numbers, 7, 6)`, `APPEND(numbers, 5)`; target `[4,9,8,4,7,3,6,5]`.

**Level 4: unsupported.** List Lab never asks the learner to traverse a list: no loops, accumulators, conditionals over elements, find/min/max, or debugging list code. **Level 2 from List Lab: unsupported** (12% of questions; about 40 answers to collect five).

## 5. Algorithm Architect

**Modes:** nine (Sequencing, Selection, Iteration, Nested Loops, Nested Conditionals, Counters, Accumulators, Searching, Procedures), each with five program variants. About 97% of generated questions are "choose the missing component" (always four options, so a guess is right 25% of the time; passing 5 of 6 by luck is about 0.5%). The rest are "arrange the algorithm", judged by running the construction.

| Component | Reading | Example |
| --- | --- | --- |
| `condition`, `loop-boundary` | Level 3: boundary and branch reasoning | `REPEAT UNTIL (???)` with `(index > n)`, `(index ≤ n)`, `(n > index)`, `(index ≥ n)` for "sum 1 + … + n" |
| `update` (data-dependent) | Level 3 | accumulator "largest value": `result ← item`; product: `result ← (result × item)`; factorial: `result ← (result × n)` |
| `update-count` | Practice (idiom recognition) | counting: `result ← (result + 1)`; distractors `result ← 1`, `result ← -1`, `result ← (result × 1)` |
| `procedure-call` (composition) | Level 3 | `result ← square(difference)` or `result ← doubleIt(subtotal)`: apply a procedure to an intermediate value |
| `procedure-call-direct` | Practice (transcription) | goal "Return the result of difference(a,b), preserving argument order"; answer `result ← difference(a, b)` |
| `arrange` | Level 3 for Sequence and Procedures | construct a whole algorithm; checked by execution |
| `initialization`, `return` | Practice | simple initialization and returning a value |

**Unchanged on purpose:** a single missing arithmetic step in a straight Sequence program (for example `result ← value`, `???`, `result ← (result / 4)`) is judged Level 3 by the existing rule. It is a defensible Level 2 and is flagged for educator review rather than reclassified.

**Level 4: unsupported** for every Architect skill (needs debugging, analysis or transfer tasks). **Level 2 for Sequence and Algorithms: unsupported**; nothing there is clearly foundational beyond the practice items above.

**Procedures has only two composition models** (variants 2 and 4), so its Level 3 requires two models, not three. This is thin; new composition variants are the real fix.

## 6. Evidence pipeline

| Check | Result | How verified |
| --- | --- | --- |
| Stable question ids | Pass | Browser: 70 Boolean and 14 Architect questions, all ids unique |
| Session ids, first attempt only | Pass | Worker's `cleanGameAttempt` accepts the real events; a retry is a second attempt of the same question, never a new first attempt (browser and unit) |
| Correct assessed mode | Pass | Browser: `make` for Boolean, the mode played for Architect |
| Difficulty and reasoning family | Pass | Browser: the family the game reported equals an independent calculation from the expression on screen for **70 of 70** Boolean questions; Architect families all name a model and a known component |
| Mapping to the right skill | Pass | Worker credits Interpret Boolean expressions and the Iteration skill |
| Focused vs Mixed | Pass (unit) | Same question gives the same node, assessed mode and family; the requested mode differs. Mixed Practice was not played in a browser. |
| No duplicate credit for retries | Pass | Worker gives a retry no skill credit; evaluator ignores it |
| Missing difficulty or family | Pass | 40 unlabelled answers per game give Level 0 |
| No credit from visits or aggregates | Pass | Existing session suites (59 shared-session assertions, daily-session) pass; no new persistence added |
| Session Summary unchanged | Pass | Existing CSP session, daily and practice suites pass |

## 7. Not supported, and what would be needed

| Skill | Missing | Needed in a future build |
| --- | --- | --- |
| Boolean Level 4 | Transfer and analysis | Equivalence and De Morgan questions, faulty-condition debugging, conditions inside programs; a family and difficulty on Evaluate questions |
| Lists Level 4 | Any list traversal | Loop-over-list tracing, accumulators and counters over lists, find/min/max, debugging list code |
| Lists Level 2 from List Lab | Volume | A beginner preset (two or three append/insert operations) with its own family |
| Sequence Level 2, Algorithms Level 2 | Foundational items | Straight-line and search-trace items that are clearly foundational |
| All Architect Level 4 | Debugging, analysis, transfer | Find-the-bug and what-does-this-compute tasks with direct attribution |
| Procedures Level 3 breadth | Only 2 composition models | At least one more composition variant to restore the three-model standard |

## 8. Ready to integrate vs needs educator review

**Ready:** the evidence helper and its two game wirings; the three test-harness injections; the Iteration recommended-mode change; the tests and audit scripts.

**Needs educator review before relying on it:**

1. The 0.25 density limit and the resulting Boolean effort (median 48 questions). A looser limit of 0.4 would still hold luck exposure to about 0.04% and trim the effort modestly.
2. Treating counter increments and direct calls as foundational. They are practice-only here; some may prefer to count them toward Level 2.
3. Two-model Level 3 for Procedures.
4. The straight-line Sequence update items, and the List Lab questions that do not catch an indexing misconception.
5. The model of guessing (a uniformly random pair). Real learners are not uniform, so the luck figures are indicative.

## 9. Limits

- Earlier events keep their earlier tags and meaning, so a learner who already earned Level 3 from a counter increment or a dense Boolean question keeps it. The density of an old question cannot be recomputed from its record.
- The effort figures assume every answer is correct, and are medians over 40 simulated students.
- Chromium was used for the browser test; Mixed Practice was tested at the unit level only.
- Audit samples are random; rerunning shifts percentages by about a point.
