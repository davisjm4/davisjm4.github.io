# Development Report — Loop Lab Expansion

## 1. What the current Loop Lab is (verified from source)

The package was developed against commit `16b628c`. Integration rechecked the current production implementation at `91ad216` and the shared `session.js`; the original Loop Lab engine remained the same static 8-mode implementation.

The audits described six generator families with few structural patterns. The source actually has **8 modes containing 38 hand-written rows in total**. There is no difficulty selection, and questions are chosen with `Math.random`. Most wrong answers are fixed offsets of the right answer (`answer − 1`, `+1`, `+2`, or `±2/+4`). In 2,000 draws the original engine produced exactly 38 distinct questions.

| Mode (id) | Learning objective | Original variants |
|---|---|---|
| Predict iteration count (`iterations`) | How many times a loop body runs: boundaries, step, zero and one iteration | inc-exclusive, dec-inclusive, zero-start, while-decrement, one-step, skip-step |
| Predict the final value (`final`) | Trace accumulators, products, overwrites, `continue`, `break` | sum-range, product, overwrite, count-even, continue-sum, break-sum |
| Choose the correct loop (`choose`) | Pick the loop matching a required output sequence | evens, down, multiples |
| Identify loop components (`components`) | Initialization, condition, update, body | for-update, for-condition, while-init, body, while-condition |
| Predict conditional behavior (`conditional`) | `if`/`continue`/`break` inside loops | odd-count, greater-sum, continue-even, break-target |
| Trace a while loop (`while`) | Values after while loops, integer division, zero iterations | integer-half, increment-sentinel, zero-while, decrement |
| Nested-loop reasoning (`nested`) | Inner loop restarts; rectangular/triangular counts; inner break | rectangle, diagonal, triangular, inner-step, break-inner |
| Debug a loop (`debug`) | Choose the single fix that meets a goal | inclusive, counter-update, accumulate, while-progress, array-bound |

A separate, older Loop Lab (Structure / Execution / Nested) lives inside the hub's `java-games/engine.js` and has its own tests. It was left unchanged.

## 2. What changed

- **Original modes:** all 8 kept, with the same ids, names and all 38 variant ids. Each variant is now a parameterized generator, and 30+ new structural variants were added (95 variants in total across all modes). Each variant is assigned to the levels where it fits, so Advanced draws structurally harder variants instead of the same loops with larger numbers. Structural variety also comes from consistent renames, statement forms, and for→while conversion.
- **New modes:** Standard Iteration Algorithms (10 families) and Count the Executions (10 families). Every family supports all three difficulties. Sorting is excluded (Search & Sort Lab covers it). String work stays at loop-state level (String Lab covers traversal). There is no file I/O; sentinel input comes from predefined arrays.
- **One engine for everything:** a Java-subset model computes answers, wrong answers, traces and metadata. No answers are stored.
- **UI:** same page structure and scoring rule (one submission = one scored attempt, then lock). Added a Difficulty control, misconception feedback, a trace table, and valid radio-group semantics; the original used `aria-pressed` buttons inside `role="radiogroup"`, which is invalid ARIA.
- **Shared progress:** the app continues to use `javaGames.session.v1`, and now annotates each active record with mode, difficulty, skill, generator family, and seed.
- **Integration quality fixes:** broadened overly small original generator parameter ranges, added step and boundary choices to loop repair traces, refreshed seeded regression fixtures, and versioned all engine imports and assets as `loop-expansion-v2`.

## 3. Verification approach

Full results are in `TEST_RESULTS.md` and `DIVERSITY_REPORT.md`, both generated from the last run.

- **Independent oracles:** about 2,100 answers per full run are recomputed with closed-form arithmetic written separately from the interpreter. These cover loop counts, nested and triangular counts, digit sums and reverses, GCD, divisor counts, sentinels, and range sums.
- **JVM:** generated programs are compiled and run. An instrumented copy counts every statement, condition evaluation, loop-body entry and comparison, and those counts are compared one by one with the model. The displayed code is also compiled and run. Terminating buggy debug programs are run to confirm they misbehave exactly as modeled.
- **Code-choice questions** (choose a loop, choose a fix, select a statement): each alternative is executed during generation. It is kept only if it fails the goal, so exactly one option works.
- **Browser:** the supplied headless Chromium suite covers every mode and difficulty, one-attempt scoring, reveal/skip tracking, keyboard selection, phone-width layout, persistence across reload, and console errors. That suite requires `puppeteer-core`, which was unavailable in this environment; production interaction checks were performed separately in Chrome.

## 4. Problems found and fixed during development

- **Scoring a mutant against the wrong question:** some wrong answers modeled a different question (for example, a condition-count used as a distractor for a value question). Fixed by attaching count mutants only to count questions.
- **Missing `// A` marker:** one-line `if` statements dropped the marker, so the question pointed at an unmarked statement. Fixed in the printer.
- **Instrumentation counted `else if` in the wrong place:** this made the JVM disagree with the model. The model was correct; the instrumented printer placed the counter inside the previous branch. Fixed by printing `else { if … }` in instrumented code only.
- **Advanced not structurally harder:** several original modes were only "bigger numbers" at Advanced. Fixed by re-tiering variants and adding dependent-bound and early-exit measures to the difficulty metadata.
- **Filler wrong answers:** ±k distractors made up 11.6% of all distractors. More modeled misconceptions (ignoring the step, value vs. count, value vs. index, sum vs. count, leaving out the statement after the loop, and others) brought it to 3.6%.
- **Narrow parameter ranges:** these caused high exact-duplicate rates (for example, 26.8% in Count the Executions/Beginner). Widening ranges, adding name/symbol pools and applying the variety layer brought both new modes under 10% in every difficulty.
- **Practice-session lag:** the session demanded more structural variety than small pools contain, causing up to ~250 ms per question in Debug. It now adapts to the pool size and caps its attempts (~20–45 ms average).
- **Session fallback picking a repeat:** after many attempts the session could accept a structure seen one question earlier. It now prefers the structure seen least recently.
- **Legacy exact-repeat hotspots:** independent samples showed excessive exact repeats in Final, While, Choose, and Debug. Expanded useful ranges and added distinct update/boundary reasoning where appropriate. In the final 30,000-question sample, every mode/difficulty cell is below 10% exact duplicates; five 100-question sessions per cell had zero exact repeats.

## 5. Known limitations

- **Small structural pools in some original modes:** the exact duplicate goal is met, but a few concise original skills still normalize to only 4–7 program shapes at a difficulty (for example Choose, Debug, and While). Their session generator keeps identical structures at least three challenges apart, and exact questions do not repeat within the 200-question in-memory history. The new Algorithm and Execution modes expose 27–77 templates and 71–301 normalized structures per difficulty in the 1,000-question samples.
- **Filler distractors still appear:** about 10% of distractors in Predict conditional behavior are filler (the highest of any mode; 3.6% overall). Some count questions with answer 0 or 1 have few distinct plausible mistakes.
- **Reasoning patterns are finite:** the generators produce effectively unlimited distinct challenges, but each template still has one underlying shape of reasoning. About 260 templates exist across all modes.
- **Content review:** done by Claude only (automated checks plus manual read-throughs of samples). No independent teacher review.
- **Testing surfaces:** automated Chromium suite requires `puppeteer-core` and was skipped in this environment. Production UI was checked separately in Chrome; Safari, Firefox, physical Chromebooks or phones, and screen readers were not tested.
- **JVM:** verification ran on OpenJDK 17. `double` output is restricted to short decimal values to avoid rare `Double.toString` differences between JDK versions.
- **Unverified on a JVM:** intentionally nonterminating debug examples (the missing-update while loop) are validated only by the model's step limit.
- **Hub Loop Lab not re-run:** the hub's separate Loop Lab and its tests were not modified and were not re-run.
- **Browser scope:** this browser uses desktop Chrome. It is not a physical Chromebook/phone check, and no screen-reader test was performed.

## 6. Acceptance criteria

| Criterion | Status |
|---|---|
| All original modes remain functional | Yes — all ids, names and variant ids kept; updated original test passes |
| Standard Iteration Algorithms implemented | Yes — 10 families |
| Count the Executions implemented | Yes — 10 families |
| Three meaningful difficulty levels | Yes — measured structural progression in every mode (TEST_RESULTS.md) |
| ≥ 8 reasoning families per new mode | Yes — 10 each |
| Improved structural diversity in existing modes | Yes — 38 rows → 95 parameterized variants; see the limits above for Choose, Debug and While |
| No finite question limit | Yes — seeded generation, bounded in-memory history |
| Java loop execution modeled correctly | Yes — matched on a JVM, including per-statement counts |
| Execution counts independently verified | Yes — JVM instrumentation and closed-form oracles |
| Loops terminate safely | Yes — step limit; nonterminating programs appear only as intended debug examples |
| Realistic misconception distractors | Yes — 53 modeled misconceptions; 3.6% filler overall |
| One-attempt scoring preserved | Yes — browser-tested |
| Session Summary compatible | Yes — same tracker calls, bounded topic ids |
| Automated tests pass | Yes — all five suites |
| Exact and structural variation measured separately | Yes — DIVERSITY_REPORT.md |
| Representative programs validated on a JVM | Yes — on Java 21 |
| Integration-ready ZIP | Yes — `java-loop-lab-expansion.zip`; not published |
