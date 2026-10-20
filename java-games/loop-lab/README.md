# Loop Lab — Expansion (loop-expansion-v2)

Target directory: `java-games/loop-lab/` on davisjm4.github.io. This package replaces the static Loop Lab question bank with a procedural engine, adds two practice modes, and keeps the existing page, modes, identifiers, scoring and Session Summary behavior.

**Status:** developed and tested outside the repository. Nothing has been committed or published. See `INTEGRATION_GUIDE.md`.

## What students get

| Mode | Id | Reasoning families |
|---|---|---|
| Predict iteration count | `iterations` | 12 structural variants (6 original) |
| Predict the final value | `final` | 10 (6 original) |
| Choose the correct loop | `choose` | 8 (3 original) |
| Identify loop components | `components` | 9 (5 original) |
| Predict conditional behavior | `conditional` | 8 (4 original) |
| Trace a while loop | `while` | 8 (4 original) |
| Nested-loop reasoning | `nested` | 10 (5 original) |
| Debug a loop | `debug` | 10 (5 original) |
| **Standard Iteration Algorithms** (new) | `algorithms` | 10 families, ~93 templates: digit extraction, divisor counting, GCD, running min/max, accumulators and averages, sentinel loops, boolean flags, String accumulation, nested algorithms, combined tracing |
| **Count the Executions** (new) | `executions` | 10 families, ~95 templates: simple counts, non-unit updates, nested independent, dependent bounds, conditional execution, early termination, comparing two algorithms, growth patterns, distinguishing counted operations, sequential/data-dependent loops |

Every mode has Beginner, Intermediate and Advanced. Difficulty changes structure (nesting, dependent bounds, conditions, early exits, number of changing variables), not just the size of numbers. Measured progression is in `TEST_RESULTS.md`.

Question types: predict output, final value of one or several variables, state after the k-th iteration, termination, counting matching items, how many times a marked statement / condition / update / comparison executes, select the missing statement, find the incorrect row in a student's trace, choose the correct loop, choose the fix, and classify growth. All are four-choice; there are no written responses.

After one submission the challenge locks and shows: the correct answer, a note explaining the misconception behind the chosen wrong answer, a short explanation, and a trace table of the loop's condition checks.

## How it works

- `engine/java-model.js` — generators build a small syntax tree for a controlled Java subset. The model prints it as indented Java, prints an instrumented Java version for verification, and executes it with Java semantics: 32-bit `int`, truncating `/`, `%` sign, compound-assignment narrowing, `double` with Java formatting, short-circuit `&&`/`||`, `String`/`char` concatenation, block scope, `break`/`continue`, and a step limit. No `eval`, no `Function`, no `Math.random`.
- Answers are computed by executing the program. Wrong answers come from running deliberately mistaken versions of the program (wrong boundary, ignored `break`, integer division, update order, sentinel processed, inner loop ignored, and so on). 53 misconception types each carry a student-facing note. Plain ±k filler is used only when a template cannot produce three distinct modeled mistakes (3.6% of distractors overall).
- `engine/rng.js` — seeded RNG; the same `{mode, difficulty, seed, family}` always produces the same challenge.
- `engine/variety.js` — consistent renaming and statement-form variation (`x++` / `x += 1` / `x = x + 1`, for → while), applied identically to the program, its mutants and the text.
- `createLoopSession()` — bounded in-memory history (no storage, no accounts). It avoids exact repeats within 200 challenges and keeps identical structures apart.

## Generator API (DOM-independent)

```js
import { generateChallenge, createLoopSession, assessLoop, MODES, DIFFICULTIES } from "./loop-engine.js";
const q = generateChallenge({ mode: "executions", difficulty: "advanced", seed: 42 }); // family optional
const session = createLoopSession({ seed: 7 });
const next = session.next({ mode: "mixed", difficulty: "intermediate" });
assessLoop(q, { answer: q.choices[0] }); // true/false
```

Each challenge exposes `mode, difficulty, seed, family/variant, reasoningFamily, template, code, prompt, choices, answer, distractors[{choice, misconception, note}], explanation, trace, studentTrace, output, metadata, params, topic, signature`. `metadata` holds `loopIterations, changingVariables, nestingDepth, loops, accumulatorUpdates, conditions, dependentBounds, earlyExits, stateTransitions, tracedOperations, score`. The executable program is available as the non-enumerable `q.javaProgram`. Legacy exports `familyNames`, `challengeFamilies`, `generateLoop(family, variant)` and `assessLoop` still work. No QTI export; Teacher Tools and Teacher Reporting are untouched.

## Tests

From this folder (Node 20.10+; no install is needed except for the browser suite):

```
node tests/run-all.mjs            # all suites at full size, then regenerate the reports
node tests/run-all.mjs --quick    # reduced samples
node tests/run-all.mjs --suite 3  # one suite (0 legacy, 1 engine, 2 diversity, 3 JVM, 4 browser), merged into the summary
```

Individual suites:

```
node loop-redesign-tests.mjs                  # original Loop Lab test, updated (see DEVELOPMENT_REPORT.md)
node tests/engine.test.mjs 1200 300           # correctness: per-cell counts for new / original modes
node tests/diversity.test.mjs 1000 300 5      # exact vs structural variation, sessions
node tests/jvm.test.mjs 40 60                 # needs a JDK 17+ (JAVA_HOME) with jdk.compiler
JAVA_GAMES_DIR=../ CHROME_PATH=/path/to/chrome node tests/browser.test.mjs   # needs puppeteer-core
```

Suites that cannot find Java or Chrome print `SKIPPED` instead of failing. `TEST_RESULTS.md` and `DIVERSITY_REPORT.md` are generated from `reports/*.json` by `tools/gen-reports.mjs`. Do not edit them by hand.

Inspect samples: `node tools/show.mjs <mode> <difficulty> <fromSeed> <count> [family]`.
