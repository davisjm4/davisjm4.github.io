# String Lab — game design

**Platform:** CS Games → Advanced Computer Science · **Future URL:** `/java-games/string-lab/` · **Stack:** static HTML + CSS + browser JavaScript, no backend, no external requests, no runtime AI.

## Purpose

String Lab helps Advanced CS students *reason* about Java String values instead of memorising method signatures. Every challenge is a real, valid Java program (or a goal and an expression to complete). Students predict, locate, choose, or trace; the game then shows exactly how Java processed the code.

Learning objectives and where they are assessed:

| Objective | Mode(s) / family examples |
|---|---|
| Predict concatenation; `+` adds numbers but joins Strings | A `predict.concat.*`, C `expr.concat`, D `trace.numbers` |
| Count characters with `length()` | A `predict.length`, C `expr.length`, B `index.lastIndex` |
| Zero-based indexing; `charAt` | A `predict.charAt`, B `index.charPosition`, C `expr.char` |
| `substring(begin)` / `substring(begin, end)`; exclusive end | A `predict.substring`, B `index.beginIndex`/`index.endIndex`, C `expr.substring`/`expr.tail` |
| `indexOf` first occurrence and `-1` | A `predict.indexOf`, B `index.indexOfCall`/`index.firstOccurrence`/`index.whichNegativeOne`, C `expr.find` |
| Combine and trace operations | A `predict.chain`/`predict.indexSubstring`, C `expr.split`, D `trace.*` |
| Immutability and reassignment; aliasing | D `trace.immutable`, `trace.mixedImmutable`, `trace.alias` |

Out of scope by design: regular expressions, file I/O, arrays, loops/conditionals as assessed ideas, `==` vs `.equals()`, exceptions, other String APIs (`toUpperCase`, `split`, `lastIndexOf`, …). `indexOf(char)` is allowed because it is taught alongside `indexOf(String)`.

## The four practice modes

* **A — Predict the Output.** Short snippet, "What does this code print?", four multiple-choice outputs.
* **B — Find the Index.** Only the declaration(s) are shown (no index labels). Questions: index of a character, what `indexOf("…")` returns, first occurrence of repeated text, which call returns `-1`, which end index extracts a given text, index inside a new substring, and so on. An indexed-character display appears **only after** the answer.
* **C — Complete the Expression.** A goal plus code with a `???` blank; students pick among valid Java expressions (never type). Every choice is compiled into a full program and evaluated; wrong choices produce a *different* value from the goal, so exactly one choice is correct.
* **D — Trace String Operations.** Sequences of declarations, reassignments, discarded method calls and aliases, ending with a print. Heavy on immutability, reassignment, and two-variable reasoning.
* **Mixed Practice** rotates through all four (never the same mode twice in a row).

## Difficulty

Difficulty is **measured**, not asserted. `js/difficulty.js` analyses the Java program a student must reason about and the generator rejects any draft whose measured level differs from the requested level.

| Metric | Meaning |
|---|---|
| `ops` | method calls + `+ - *` operators |
| `concepts` | Concatenation, Length, Character Indexing, Substrings, Searching, Immutability |
| `depends` | an operation consumes the result of another (nested, or through a computed variable) |
| `stateEvents` | reassignments + String aliases + discarded calls |
| `extraVars` | variables beyond the first |
| `twists` | `indexOf` returning `-1` or matching repeated text; declared inverse reasoning ("which end index?") |
| `steps` | `ops + stateEvents + extraVars + twists` |

* **Beginner** — exactly one operation, one variable, no twists, no aliasing or discarded calls, at most one simple reassignment.
* **Intermediate** — 2 to 5 steps, at most four operations; repeated characters, `-1`, numbers in concatenation, simple reassignment, immutability basics.
* **Advanced** — operations depend on each other, at least two different concepts, at least three operations and five steps (e.g. indexOf feeding substring, two variables updated in sequence, method chaining, numeric expressions inside concatenation). A relevance check also rejects any statement that does not affect the result, so advanced code is never padded.

Advanced Mode A and D programs use 4–6 statements. Advanced Mode B and C questions show 2–3 lines because the interaction comes from the question itself (e.g. `start` computed by `indexOf`, then "which end index?").

## Feedback and scoring

* One scored attempt per challenge. No repeated guessing.
* After **Check Answer**: verdict, the correct answer, the key idea, *why the chosen wrong answer is tempting* (from the misconception id behind that distractor), a line-by-line trace, and an index map highlighting what each `charAt`/`substring`/`indexOf` touched.
* The trace is built from the same evaluator that graded the answer, so explanation and grading cannot disagree. It is not in the page before the student answers.
* **Show the answer** is available as a clearly separate action (recorded as *revealed*, not as a correct answer).
* **New Challenge** replaces an unanswered challenge (recorded as *skipped*). **Next Challenge** follows feedback.

## Distractors

Wrong answers come from named misconceptions: one-based indexing, inclusive end index, off-by-one starts, "methods change the original String", "the second variable follows the first", adding numbers inside a concatenation, last instead of first occurrence, `0` instead of `-1`, length vs last index, index in the original vs the new substring, and more (full list in REASONING_FAMILIES.md). Most are produced by re-running the program under that misconception. Distractors are unique, never equal to the correct answer, and at least one per challenge is a realistic misconception rather than a nearby number. Answer positions are shuffled by the seeded RNG (observed correct-position shares 25.9 / 25.6 / 25.6 / 22.9 % over 11,970 challenges; the fourth slot is lower only because 5.7 % of challenges have three options).

## Interface

Dark Java Games palette (`#0c1722` background, `#152536` panels, `#33495c` borders, `#eff6fb` / `#b4c5d3` text, teal and gold accents). Mode and difficulty are segmented radio groups; the code panel is wrapped monospace (no horizontal scrolling for the snippets the generator produces); choices are native radio inputs in large touch targets; feedback appears below the choices; Session Summary opens a dialog. Query parameters: `?mode=predict|index|expr|trace|mixed`, `?difficulty=beginner|intermediate|advanced`, `?seed=N` (reproducible sessions), `?postMessage=1` (opt-in parent-window events).

## Accessibility

Keyboard: arrow keys move between mode/difficulty radios, 1–4 choose an answer, Enter checks / advances, Escape closes the summary. Focus moves to the feedback heading after checking and to the prompt on a new challenge; 3 px gold focus rings; skip link; labelled groups; polite live region; index maps carry a full text description for screen readers; correct/incorrect is shown with text tags and icons, never colour alone; choices are at least 44 px tall; `prefers-reduced-motion` respected; no dragging or code typing anywhere.

## Known limitations

* ASCII text only (one displayed character = one index position), by design.
* Empty-substring results are never an answer (they are verified in the JVM edge-case tests but not asked).
* The word pool is ~540 familiar words (authored words, regular word forms, and real compound words). Some questions (for example "first occurrence of repeated text") have a smaller space than others; `TEST_RESULTS.md` reports the measured exact-duplicate rate (6.5 % over 11,970 challenges in one draw) and the session generator never repeats an exact question within a session.
* Session data is in memory only; nothing persists between page loads (by design — no accounts).
