# Math Lab issue 40 follow-up

Baseline commit `2bd052725aa2280fa4480063e34d7f29140e0096`. The repair covers four original-mode structures with numeric cues, nested grouping feedback, and localized expansion questions. CSG-UX-03 governs feedback. CSG-MAS-01 and CSG-MAS-04 govern first attempts and evidence. The change preserves mode and family identifiers, scoring, evidence eligibility, and the shared session interfaces. It requires no data migration.

- The divisibility structure asks for a remainder from a mix of exact multiples and nearby values. Exact multiples are intentional. A near multiple can be mistaken for an exact one, and the corresponding wrong choice explains how to check.
- Product/remainder questions use both signs for the product. Distractors derive from applying remainder first, taking the integer quotient, dropping a factor, or rounding the quotient in the wrong direction. Correct evaluation still uses left-associative multiplication and remainder.
- Signed remainder uses `a - (a / b) * b` with integer division toward zero. Distractors include using the divisor's sign, dropping a sign, rounding the quotient down, and swapping operands. Smaller signed dividends deliberately produce zero quotients.
- Original-mode feedback explains the selected misconception for those four structures and nested grouping. For example, a student who multiplies only one addend is told that the factor applies to the entire grouped sum. The second addend and the factor can be negative. The other original structures retain their general explanations.
- Numeric Limits Beginner now mixes positive and negative integer division and midpoint examples. The wrong options distinguish quotient, remainder, rounding, and output representation. It still tests real upper and lower boundary wraparound, precision, and division by zero.

## Held-out shortcut evidence

Run `node java-games/math-lab/issue-40-tests.mjs` or pass the absolute path to the baseline checkout's Math Lab directory. The original-mode study covers all 26 value structures. It uses 300 seeds for training and 300 for validation per structure, with an LCG started at `base * 1000003 + i * 7919 + shape.length` and bases 3 and 4. A heuristic is selected on training data and evaluated on validation. The choices are ranks 0 through 3, lowest absolute value, and closest to the mean. The lowest-absolute-value audit counts ties as hits, so its score is an upper bound when a learner has to choose among tied values.

| Structure | Before heuristic | Before | After heuristic | After | Held-out ranks before | Held-out ranks after |
| --- | --- | ---: | --- | ---: | --- | --- |
| modulus:divisible | rank0 | 100.0% | minAbs | 61.7% | 300 / 0 / 0 / 0 | 57 / 94 / 102 / 47 |
| modulus:negative-divisor | minAbs | 64.3% | minAbs | 45.3% | 77 / 75 / 74 / 74 | 20 / 80 / 75 / 125 |
| modulus:both-negative | minAbs | 58.3% | minAbs | 50.0% | 77 / 75 / 73 / 75 | 91 / 74 / 82 / 53 |
| expressions:product-remainder | rank0 | 76.3% | minAbs | 54.3% | 229 / 44 / 24 / 3 | 130 / 76 / 56 / 38 |
| expressions:nested-group | minAbs | 43.0% | rank3 | 38.7% | 74 / 73 / 77 / 76 | 72 / 76 / 36 / 116 |

Product/remainder using the same smallest-choice tactic fell from 229/300 (76.3%) to 130/300 (43.3%). Divisibility retained 150/300 zero-remainder keys. The 21 other value structures reproduced the same results.

Numeric Limits Beginner across 1,500 generated questions in each seed range, restricted to four plain numeric choices:

| Seed range | Numeric n | Smallest before | Smallest after | Rank counts before | Rank counts after |
| --- | ---: | ---: | ---: | --- | --- |
| 1–1500 | 480 | 353/480 (73.5%) | 162/480 (33.8%) | 353 / 23 / 104 / 0 | 162 / 181 / 126 / 11 |
| 900001–901500 | 449 | 331/449 (73.7%) | 129/449 (28.7%) | 331 / 21 / 97 / 0 | 129 / 183 / 124 / 13 |

The original 353/480 rate is reproducible. Several overflow shapes use an exception option and therefore never entered that four-numeric-choice denominator. The concentrated choices came largely from positive integer-division and average examples that place truncation below rounding and real division. Wraparound still makes upper- and lower-bound examples act differently.

| Changed Beginner structure | Before smallest / numeric | After smallest / numeric |
| --- | ---: | ---: |
| nl.average:two-ints | 135/135 | 39/135 |
| nl.int-division:cast-before | 0/70 | 0/32 |
| nl.int-division:double-dest | 92/92 | 10/74 |
| nl.int-division:int-dest | — | 5/56 |
| nl.midpoint:negative-odd | — | 0/29 |
| nl.midpoint:small-odd | 61/61 | 32/32 |


## Difficulty review

| Structure | Cognitive demand | Action |
| --- | --- | --- |
| Advanced quotient/remainder reassembly | If the later multiplier equals the divisor, `11 / 3 * 3 + 11 % 3` reconstructs 11 and the trace can be skipped. A distinct multiplier requires accounting for both truncation and remainder before combining them. | The old candidate pool could not supply three distinct distractors for the sampled reassembly drafts. Added targeted distractors and applied the distinct-multiplier constraint. |
| Advanced nested power | `Math.pow(Math.pow(2, 3), 2) - Math.pow(2, 6)` cancels. Excluding equal exponents keeps the nested evaluation and subtraction relevant. | Applied the constraint. Exponent laws are still a valid way to reason about nested powers. |
| Advanced split/remainder | `left / people` is always zero when `left = total % people` for the positive inputs shown. The intended smaller-dividend example remains valuable, but the Advanced label overstates the work once students recognize that invariant. | Preserve the example and review placement at Intermediate, or use a separate advanced variant where casting before division makes the remainder affect the share. |
| Advanced power-to-int saturation | In `(int) Math.pow(10, 11)`, large size signals saturation. The reasoning is the distinction between casting a double and wrapping an int, with little state to track. | Preserve the boundary lesson. Consider tier placement or a paired cast-and-wrap comparison during educator review. |
| Advanced mixed numeric trace and two casts | Students must resolve where int division discards the fraction, track a remainder or update, and apply the result to later operations. Advanced midpoint comparisons reason about an overflowed sum and a safe reordered calculation. | Current demand is supported by dependent operations and Java types. |

Exact multiples, lower and upper integer boundary examples, and intentional zero-quotient structures remain represented. The targeted review identified the examples above. A full educator classification of all expansion families is separate.

## Validation

The full original Math Lab suite compiled and ran 4,600 student-visible expressions or declarations, including the reverse options, across 3,100 questions. The quality suite checked 10,400 generated questions. The full expansion suite checked 6,000 generated challenges across both modes and all tiers, plus 9,955 JVM checks with zero disagreements and 60 scored simulated DOM submissions. Local Chromium confirmed contextual feedback, narrow layout, difficulty switching, keyboard scoring, and offline play with loaded assets. Guest reload retains scored totals and draws a fresh unanswered question. Release and production results are recorded on the PR.
