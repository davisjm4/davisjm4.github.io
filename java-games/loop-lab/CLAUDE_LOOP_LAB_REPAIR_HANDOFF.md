# Loop Lab instructional-quality repair — handoff

Branch `fix/claude-loop-lab-quality` from `main` @ `179ecf3` (includes PR #37). Scope: `java-games/loop-lab/` only. Not pushed, merged or deployed; PR #36, teacher tools, mastery policy and other games untouched. Commit SHA: see `git log -1` on the branch / patch header.

## Changes
| Finding | Fix | File |
|---|---|---|
| D1 answer shown | Inline-if printer now honours the blank | `engine/java-model.js` |
| D2 family label | Header built by pure `challengeHeaderParts` (mode · difficulty only); variant ids stay on the question | `loop-header.js` (new), `loop-ui.js` |
| D4/W1 text mismatch | Inner-update choice derived from the displayed node; nested prompt no longer names a statement form | `engine/families-original.js` |
| D3 rank patterns | Seeded side-balanced distractor selection, automatic under-count / start-shift / if-boundary / logic-operator candidates, randomized fallback filler | `engine/questions.js` |
| Cache busting | `?v=loop-quality-v1` on changed modules | engine imports, `loop-engine.js`, `index.html` |
| Tests/docs | `tests/quality-repair.test.mjs`, `tests/displayed-code-jvm.test.mjs`, `tests/helpers/java-batch.mjs`, `tests/run-all.mjs`, `package.json`, `README.md` | |

Not changed: question modes, loop-type answer policy (`while(true)`+`break` untouched), `ENGINE_VERSION`, topic/concept/family/template ids, metadata scores (identical on 1,980 same-seed questions; only 7 keyed answers and 27 prompts changed, all D4/W1).

## Before / after
- D1 `algorithms:beginner:50102`: `if (21 % d == 0) count++;` → `if (21 % d == 0) { ________________; }`. Select-statement without blank: 121/453 → 0/453.
- D2: "Debug a loop · Wrong direction · Intermediate" → "Debug a loop · Intermediate".
- D4 `components:intermediate:1955`: choices `row < 5, col++, total++;, row++` (code shows `col += 1`) → `row < 5, col += 1, total++;, row++`.
- W1 `nested:intermediate:153`: "How many times does hits++ execute?" → "…does the statement that adds 1 to hits execute?" (code: `hits = hits + 1;`).
- D3 `nested:advanced:100` choices `8,4,12,10` → `8,12,10,6` (answer 8).

## Numeric answer-rank exploit (same seeds, 500 train / 500 validation, numeric questions, chance 25%)
Accuracy of always picking the most common correct-answer rank learned on training seeds.
| Mode | Tier | Before | After |
|---|---|---|---|
| iterations | beginner | 52.8% | 43.2% |
| iterations | intermediate | 55.2% | 47.6% |
| iterations | advanced | 55.4% | 55.4% |
| final | beginner | 49.2% | 38.4% |
| final | intermediate | 41.2% | 24.4% |
| final | advanced | 39.2% | 30.3% |
| conditional | beginner | 38.4% | 48.8% |
| conditional | intermediate | 52.0% | 56.6% |
| conditional | advanced | 54.8% | 53.2% |
| while | beginner | 34.6% | 31.6% |
| while | intermediate | 28.7% | 25.4% |
| nested | beginner | 63.2% | 45.6% |
| nested | intermediate | 92.6% | 35.5% |
| nested | advanced | 94.7% | 34.8% |
| algorithms | beginner | 52.8% | 40.3% |
| algorithms | intermediate | 45.9% | 33.2% |
| algorithms | advanced | 53.6% | 34.4% |
| executions | beginner | 41.9% | 36.6% |
| executions | intermediate | 51.5% | 38.6% |
| executions | advanced | 54.2% | 35.3% |
Mean over 20 cells: 52.6% → 39.5%. **Unresolved:** Conditional beginner/intermediate worsened (38.4→48.8, 52.0→56.6) and Iterations advanced is unchanged (55.4). Those families offer only ~3 distinct misconception values with the answer structurally between them; they need family-specific distractors (follow-up). Answer positions were already uniform and are unchanged.

## Independent Java verification
`evidence/` (in the zip): final run of the 4,500-question displayed-code verifier (150 per mode × tier): **4,500 pass, 0 FAIL, 0 unverified**, 6,921 programs (baseline: 4,473 pass, 27 FAIL = 23 component + 4 blank). 3 "after the k-th iteration" string-accumulation questions are convention-dependent (keyed after-update); unchanged, deferred. Committed regression version: `node tests/displayed-code-jvm.test.mjs 40` → 1,200 questions, 1,841 programs, 0 fail. Choose-loop and debug-fix uniqueness (exactly one valid choice) is part of that run.

## Tests and commands
| Command | Result |
|---|---|
| `node tests/quality-repair.test.mjs 300` | 20,917 checks pass (fails on baseline at D1 seed 50102) |
| `node tests/displayed-code-jvm.test.mjs 40` | 0 fail (baseline: 4 component fails) |
| `node tests/engine.test.mjs 300 100` | 143,791 pass (reduced size) |
| `node loop-redesign-tests.mjs` | 30,494 pass |
| `node tests/diversity.test.mjs 300 100 3` | 150 pass, fallback share 0.016 |
| `node tests/package-c-feedback.test.mjs`, `tests/loop-types.test.mjs` | pass |
| `node tests/jvm.test.mjs 10 20` | 5,322 pass |
| `node java-games/loop-quality-tests.mjs` | pass |
| `node java-games/loop-jvm-tests.mjs` | **fails on unmodified main** (hard-coded `/usr/lib/jvm/java-17-openjdk-amd64`); passes with an environment-only symlink to Java 21 |
| `node --test cs-games/pathway/tests/*.test.mjs` | 320 pass |
Reduced sizes were used for time; run-all full sizes were not run. `tests/browser.test.mjs` SKIPPED (no puppeteer-core/Chromium here); `tests/run-all.mjs` regenerates `reports/`, which I deliberately did not commit.

## Known limitations
D3 residual above; no browser/UI run (D2 covered by source and header-text tests); component questions are checked structurally; distractor realism has not had educator review; new automatic candidates add misconception tags `logic-operator` and more `missed-final`/`off-start`/`boundary` mix.

## Deferred (not changed)
W2 dead statements counted in difficulty; W3 weak Advanced difficulty (`while`, iterations); W4 predictable Choose-the-Loop-Type wording; W5 `while(true)`+`break` alternatives for first-attempt, validation-read-first, menu-after-selection; W6 remaining generic fallbacks; W7 other wording ("Which code total ends as N?", "loop execute" vs "body execute").

## Integration
Apply `loop-lab-repair.patch` (`git am`) or fetch the bundle. Deploy `java-games/loop-lab/` together (shared module URLs changed). No data migration; evidence fields unchanged. Run `node tests/quality-repair.test.mjs` and `node tests/displayed-code-jvm.test.mjs` after merging.
