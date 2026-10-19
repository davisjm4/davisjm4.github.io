# TEST_RESULTS

All numbers below are produced by the commands shown and stored in `reports/*.json` / `reports/run-all.log`. Run everything with `npm test` (about 80 seconds).

## Summary

| Check | Result |
|---|---|
| Static audit (no eval / dynamic code / DOM / Node-only APIs in `src/`) | static audit: 11 source files scanned, 0 violations |
| Unit tests (`tests/unit.test.mjs`) | unit tests: 35 passed, 0 failed |
| Bulk validation (`tests/bulk.test.mjs`) | 20,000 challenges, 922,269 individual checks, **0 failures**, 43.8s |
| Advanced audit | 2,000 consecutive questions: 0 exact repeats, 108 semantic repeats, min semantic distance 61 |
| JVM verification | 8,000 programs compiled and run on openjdk version "21.0.12.1" 2026-08-18; 0 failures |

## Bulk validation: 20,000 generated challenges

Generated round-robin over difficulty × type × format (45 cells), with every other round forcing one reasoning family that exists for that type, using one bounded history per difficulty. Challenges per cell grid (primary generated type, and question format):

| difficulty | int | double | boolean | char | String | output | final | checkpoint |
|---|---|---|---|---|---|---|---|---|
| beginner | 1335 | 1335 | 1335 | 1335 | 1335 | 2225 | 2225 | 2225 |
| intermediate | 1335 | 1334 | 1332 | 1332 | 1332 | 2222 | 2222 | 2221 |
| advanced | 1332 | 1332 | 1332 | 1332 | 1332 | 2220 | 2220 | 2220 |

Every reasoning family appeared (none missing). Challenges containing each family:

| family | challenges |
|---|---|
| SEQUENTIAL_UPDATE | 15547 |
| REASSIGN_OVERWRITE | 11472 |
| ASSIGN_COPY | 7443 |
| COMPOUND_ASSIGNMENT | 4682 |
| STRING_CONCAT | 4594 |
| COPY_INDEPENDENCE | 4211 |
| BOOLEAN_NEGATION | 3649 |
| DOUBLE_ARITHMETIC | 3053 |
| REMAINDER | 2448 |
| BOOLEAN_COMBINATION | 2210 |
| PARENTHESES | 2073 |
| OPERATOR_PRECEDENCE | 1556 |
| PRINT_VS_STORED | 1540 |
| STRING_NUMBER_CONCAT | 1282 |
| MIXED_NUMERIC | 1141 |
| INCREMENT_DECREMENT | 1118 |
| INTEGER_DIVISION | 485 |

Misconception IDs exercised as distractors:

| misconception | distractors |
|---|---|
| STALE_VALUE | 8824 |
| IGNORE_UPDATE | 7490 |
| OLD_VALUE_IGNORED | 4509 |
| ASSIGN_DIRECTION_REVERSED | 4371 |
| CONCAT_ORDER_REVERSED | 3476 |
| ASSIGN_AS_ADD | 3161 |
| COMPOUND_AS_ASSIGN | 3121 |
| CHAR_AS_NUMBER | 2939 |
| MULT_AS_ADD | 2746 |
| LINKED_COPY | 2044 |
| BOOLEAN_NEGATION_IGNORED | 1684 |
| DIV_MOD_CONFUSION | 1323 |
| COMPOUND_REVERSED | 1259 |
| DOUBLE_FORMAT_DROPPED | 957 |
| AND_OR_CONFUSION | 802 |
| OPERATOR_PRECEDENCE_IGNORED | 790 |
| PRINT_STORES_VALUE | 589 |
| INT_DIV_EXACT | 246 |
| COMPOUND_PARTIAL_RHS | 169 |
| INT_DIV_ROUNDED | 119 |
| CONCAT_NUMBERS_ADDED_FIRST | 44 |
| CONCAT_NUMBERS_AS_TEXT | 3 |
| RELATIONAL_BOUNDARY | 1 |

Checks applied to **every** challenge:

1. The stored Java model passes an independent static type / definite-assignment checker (no uninitialized reads, no type-incompatible assignment, no redeclaration, no `String ==`, no `double %`).
2. Code has one statement per line and no loops, branches, arrays, methods, objects or Scanner.
3. Re-executing the stored model reproduces the stored correct answer.
4. Checkpoint questions: the asked line number maps to the displayed statement, the state table row matches the answer, and no value appears in the code.
5. Explanation: one entry per code line, per-line "changes" equal the state table, the text contains each new value, print lines contain the printed text, and the summary contains the answer. (Text is built from interpreter events, so it cannot disagree with execution.)
6. Difficulty rules are recomputed from scratch on the stored program (Advanced additionally: ≥ 3 relevant changes, ≥ 2 core families, dependency depth ≥ 4, ≥ 2 variables in the slice).
7. Slice soundness (dynamic): skipping every statement outside the dependency slice leaves the answer unchanged.
8. Every relevant update visibly changes its variable (no no-op complexity).
9. Choices are unique, contain the correct answer, and the count is right (2 for Boolean, 4 otherwise, 3 or 4 for char); no distractor equals the answer; every distractor has a known misconception ID, label and explanation and is **reproducible**: re-running the named misconception model over the program yields exactly that text; not every distractor is answer ± 1.
10. Magnitudes: ints ≤ 2000 in absolute value, Strings ≤ 22 characters, doubles with at most three exact decimal digits.
11. Determinism: every 97th challenge is regenerated from the same seed and history and compared byte-for-byte.
12. The generator accepted a candidate only after relaxing a repetition rule in 890 of 20000 cases (4.5%); these are concentrated in Beginner, whose grammar is tiny by design.

## Independent JVM verification (`jvm/verify.mjs`)

| Measure | Value |
|---|---|
| JVM | openjdk version "21.0.12.1" 2026-08-18 |
| Programs generated | 8,000 |
| Programs compiled with javac | 8,000 |
| Programs executed | 8,000 |
| Printed-output comparisons passed | 8,000 / 8,000 |
| Variable states compared (after every statement of every program) | 91,222 / 91,222 |
| Stored correct answers vs instrumented JVM (output / final value / checkpoint) | 8,000 / 8,000 |
| Failures | 0 |
| javac time / run time | 6.5s / 1.3s |

How it works: each generated program is emitted as a real Java method. After **every** statement the harness inserts `System.out.println("@@<line>|name=" + name ...)`, so intermediate checkpoint values are read from the JVM itself. Programs are batched into classes, compiled together with `javac`, and run in one JVM. The harness compares (a) all printed lines, (b) every variable after every statement, and (c) the stored correct answer for each question format. Java semantics exercised: 193 int divisions with a discarded remainder (51 with a negative operand), 160 remainders with a negative dividend, 4227 double operations, 5646 String concatenations, 3458 compound assignments. Reasoning families covered in the JVM sample: 17 of 17.

**Failures and corrections.** The JVM stage found **no** mismatches between the model and Java, so no semantic corrections were needed from it. (Development-time corrections found by the unit tests were mistakes in test expectations and generator rules — e.g. a hand-computed expected value in a test was wrong, dead-store and trivial-expression rules were added to the generator — not Java-semantics bugs in the interpreter.)

**Is the harness actually sensitive?** To check that "0 failures" is meaningful, two deliberate bugs were injected into a *copy* of the interpreter and the harness rerun on 3,000 programs each: integer division using Math.floor instead of truncation → 9 printed-output mismatches, 42 state mismatches, 11 stored-answer mismatches (harness exit code non-zero); remainder using a floored modulo (sign of the divisor) instead of Java's sign-of-dividend → 21 printed-output mismatches, 141 state mismatches, 29 stored-answer mismatches (harness exit code non-zero). The real interpreter was restored afterwards.

## Limits and honest caveats

- The Variable Lab source could not be inspected (see WORK_INTEGRATION_GUIDE.md), so nothing here tests the integrated UI.
- The JVM verifies that the *model* matches Java for the generated programs; it cannot verify that a distractor corresponds to a misconception any particular student holds. Distractor feedback is worded as "reasoning that would give this answer".
- The Java model only covers the supported subset (no loops, branches, arrays, methods, objects, Scanner, or String methods).
